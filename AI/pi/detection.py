from dataclasses import dataclass

import cv2
import numpy as np
from hailo_platform import (
    HEF, VDevice, HailoStreamInterface,
    InferVStreams, ConfigureParams,
    InputVStreamParams, OutputVStreamParams, FormatType,
)


@dataclass
class FireTarget:
    cx: int
    cy: int
    x: int
    y: int
    w: int
    h: int
    area: float
    norm_x: float
    norm_y: float


# ── Hailo / YOLOv8 constants ──────────────────────────────────────────────────

FIRE_CLASSES     = {0, 1, 2}        # Ates, Fire, Fire Detection
ALL_FIRE_CLASSES = {0, 1, 2, 9}    # + smoke (lower threshold)
CONF_THRESH = 0.15
FIRE_THRESH = 0.07
IOU_THRESH  = 0.45

SCALES = [
    ("yolov8n_10cls/conv41", "yolov8n_10cls/conv42", 8),
    ("yolov8n_10cls/conv52", "yolov8n_10cls/conv53", 16),
    ("yolov8n_10cls/conv62", "yolov8n_10cls/conv63", 32),
]


# ── Hailo detector ────────────────────────────────────────────────────────────

class HailoDetector:
    """Context manager that keeps the Hailo pipeline open for the session."""

    def __init__(self, hef_path: str):
        self.hef_path    = hef_path
        self._hef        = None
        self._device     = None
        self._infer_ctx  = None
        self._ng_ctx     = None
        self._pipeline   = None
        self._input_name = ""

    def __enter__(self) -> "HailoDetector":
        self._hef    = HEF(self.hef_path)
        self._device = VDevice()
        cfg    = ConfigureParams.create_from_hef(self._hef, interface=HailoStreamInterface.PCIe)
        ng     = self._device.configure(self._hef, cfg)[0]
        ng_params     = ng.create_params()
        input_params  = InputVStreamParams.make(ng, format_type=FormatType.UINT8)
        output_params = OutputVStreamParams.make(ng, format_type=FormatType.FLOAT32)
        self._input_name = self._hef.get_input_vstream_infos()[0].name

        self._infer_ctx = InferVStreams(ng, input_params, output_params)
        self._pipeline  = self._infer_ctx.__enter__()
        self._ng_ctx    = ng.activate(ng_params)
        self._ng_ctx.__enter__()
        return self

    def __exit__(self, *args) -> None:
        if self._ng_ctx:
            self._ng_ctx.__exit__(*args)
        if self._infer_ctx:
            self._infer_ctx.__exit__(*args)

    def infer_rgb(self, frame_bgr: np.ndarray) -> np.ndarray:
        """Run Hailo inference on a BGR frame. Returns fire-class binary mask."""
        orig_h, orig_w = frame_bgr.shape[:2]
        # boost contrast so small/distant flames stand out more
        lab = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        frame_bgr = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        resized, scale, pad = _letterbox(rgb)
        outputs = self._pipeline.infer(
            {self._input_name: np.expand_dims(resized, axis=0)}
        )
        detections = _decode_outputs(outputs, orig_w, orig_h, scale, pad)

        mask = np.zeros((orig_h, orig_w), dtype=np.uint8)
        for (x1, y1, x2, y2), _score, cls_id in detections:
            if cls_id in FIRE_CLASSES:
                cv2.rectangle(mask, (int(x1), int(y1)), (int(x2), int(y2)), 255, -1)
        return mask


# ── YOLOv8 decode helpers ─────────────────────────────────────────────────────

def _letterbox(img: np.ndarray, size: int = 640, color=(114, 114, 114)):
    h, w = img.shape[:2]
    scale = min(size / w, size / h)
    new_w, new_h = int(round(w * scale)), int(round(h * scale))
    img = cv2.resize(img, (new_w, new_h))
    pad_w = (size - new_w) / 2
    pad_h = (size - new_h) / 2
    top,  bottom = int(round(pad_h - 0.1)), int(round(pad_h + 0.1))
    left, right  = int(round(pad_w - 0.1)), int(round(pad_w + 0.1))
    img = cv2.copyMakeBorder(img, top, bottom, left, right,
                              cv2.BORDER_CONSTANT, value=color)
    return img, scale, (left, top)


def _dfl_decode(box_raw: np.ndarray) -> np.ndarray:
    H, W, _ = box_raw.shape
    box = box_raw.reshape(H, W, 4, 16)
    box = box - box.max(axis=-1, keepdims=True)
    box = np.exp(box)
    box = box / box.sum(axis=-1, keepdims=True)
    return (box * np.arange(16, dtype=np.float32)).sum(axis=-1)  # (H,W,4) ltrb


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_thresh: float):
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep  = []
    while order.size:
        i = order[0]; keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0, xx2 - xx1) * np.maximum(0, yy2 - yy1)
        iou   = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        order = order[1:][iou < iou_thresh]
    return keep


def _decode_outputs(outputs, orig_w, orig_h, scale, pad):
    all_boxes, all_scores, all_cls = [], [], []
    pad_x, pad_y = pad

    for box_key, cls_key, stride in SCALES:
        box_raw = outputs[box_key][0]   # (H, W, 64)
        cls_raw = outputs[cls_key][0]   # (H, W, 10)
        H, W    = box_raw.shape[:2]

        ltrb       = _dfl_decode(box_raw) * stride
        cls_scores = cls_raw
        conf       = cls_scores.max(axis=-1)
        cls_id     = cls_scores.argmax(axis=-1)

        thresh_map = np.where(np.isin(cls_id, list(ALL_FIRE_CLASSES)), FIRE_THRESH, CONF_THRESH)
        mask = conf > thresh_map
        if not mask.any():
            continue

        gy, gx = np.meshgrid(np.arange(H), np.arange(W), indexing="ij")
        cx_g = (gx + 0.5) * stride
        cy_g = (gy + 0.5) * stride

        x1 = ((cx_g - ltrb[..., 0])[mask] - pad_x) / scale
        y1 = ((cy_g - ltrb[..., 1])[mask] - pad_y) / scale
        x2 = ((cx_g + ltrb[..., 2])[mask] - pad_x) / scale
        y2 = ((cy_g + ltrb[..., 3])[mask] - pad_y) / scale

        all_boxes.append(np.stack([x1, y1, x2, y2], axis=1))
        all_scores.append(conf[mask])
        all_cls.append(cls_id[mask])

    if not all_boxes:
        return []

    boxes   = np.concatenate(all_boxes)
    scores  = np.concatenate(all_scores)
    classes = np.concatenate(all_cls)
    keep    = _nms(boxes, scores, IOU_THRESH)
    return [(boxes[i], scores[i], classes[i]) for i in keep]


# ── Thermal detection ─────────────────────────────────────────────────────────

def detect_fire_thermal(frame_raw: np.ndarray, fire_temp_min: float) -> tuple[np.ndarray, np.ndarray]:
    if frame_raw.shape[0] == 122:
        frame_raw = frame_raw[:120, :]
    elif frame_raw.shape[1] == 122:
        frame_raw = frame_raw[:, :120]

    temp_c = (frame_raw.astype(np.float32) / 100.0) - 273.15
    temp_c = np.clip(temp_c, -40, 500)

    # absolute threshold — catches close/intense fires
    hot_absolute = temp_c > fire_temp_min

    # relative threshold — catches distant/small fires that are just
    # significantly hotter than their surroundings (e.g. candle at 2m+)
    scene_median = float(np.median(temp_c))
    above_ambient = temp_c > (scene_median + 15.0)
    # only count relative hits if the pixel is at least warmer than ambient+5
    # and above a minimum absolute floor to avoid noise
    hot_relative = above_ambient & (temp_c > (scene_median + 5.0)) & (temp_c > 20.0)

    mask = np.zeros(frame_raw.shape[:2], dtype=np.uint8)
    mask[hot_absolute | hot_relative] = 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask   = cv2.dilate(mask, kernel, iterations=1)
    return mask, temp_c


def temp_to_colormap(temp_c: np.ndarray) -> np.ndarray:
    valid = temp_c[temp_c > -40]
    if len(valid) == 0:
        return np.zeros((*temp_c.shape, 3), dtype=np.uint8)

    t_min = np.percentile(valid, 5)
    t_max = np.percentile(valid, 99)
    if t_max - t_min < 5:
        t_max = t_min + 5

    normalized = np.clip((temp_c - t_min) / (t_max - t_min) * 255, 0, 255).astype(np.uint8)
    return cv2.applyColorMap(normalized, cv2.COLORMAP_INFERNO)


def get_fire_target(mask: np.ndarray, frame_w: int, frame_h: int, min_fire_area: int) -> FireTarget | None:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    area    = cv2.contourArea(largest)
    if area < min_fire_area:
        return None

    x, y, w, h = cv2.boundingRect(largest)
    cx = x + w // 2
    cy = y + h // 2

    return FireTarget(
        cx=cx, cy=cy, x=x, y=y, w=w, h=h, area=area,
        norm_x=(cx - frame_w / 2) / (frame_w / 2),
        norm_y=(cy - frame_h / 2) / (frame_h / 2),
    )
