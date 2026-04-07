import os
import time
import cv2
import numpy as np
from hailo_platform import (
    HEF, VDevice, HailoStreamInterface,
    InferVStreams, ConfigureParams,
    InputVStreamParams, OutputVStreamParams, FormatType
)

HEF_PATH = "/home/ai/Desktop/projects/dub-fire/AI/models/converted/yolov8n_10cls.hef"
CONF_THRESH = 0.20
FIRE_CLASSES = {0, 1, 2, 9}   # Ates, Fire, Fire Detection, smoke — lower threshold
FIRE_THRESH  = 0.12
IOU_THRESH  = 0.45
SNAPSHOT_PATH = "/home/ai/Desktop/projects/dub-fire/AI/models/snapshot.jpg"

CLASSES = ['Ates', 'Fire', 'Fire Detection', 'api', 'car-crash', 'fight', 'knife', 'no-fight', 'pistol', 'smoke']
COLORS  = [
    (0, 80, 255), (0, 0, 255), (0, 30, 255), (0, 60, 255),
    (255, 165, 0), (255, 0, 180), (128, 0, 255), (0, 200, 0),
    (255, 50, 50), (100, 100, 255)
]

os.environ.setdefault("QT_QPA_PLATFORM", "wayland")

SCALES = [
    ("yolov8n_10cls/conv41", "yolov8n_10cls/conv42", 8),
    ("yolov8n_10cls/conv52", "yolov8n_10cls/conv53", 16),
    ("yolov8n_10cls/conv62", "yolov8n_10cls/conv63", 32),
]


def letterbox(img, size=640, color=(114, 114, 114)):
    h, w = img.shape[:2]
    scale = min(size / w, size / h)
    new_w, new_h = int(round(w * scale)), int(round(h * scale))
    img = cv2.resize(img, (new_w, new_h))
    pad_w = (size - new_w) / 2
    pad_h = (size - new_h) / 2
    top, bottom = int(round(pad_h - 0.1)), int(round(pad_h + 0.1))
    left, right  = int(round(pad_w - 0.1)), int(round(pad_w + 0.1))
    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    return img, scale, (left, top)


def dfl_decode(box_raw):
    # box_raw: (H, W, 64) — 4 coords * 16 DFL bins
    H, W, _ = box_raw.shape
    box = box_raw.reshape(H, W, 4, 16)
    box = box - box.max(axis=-1, keepdims=True)
    box = np.exp(box)
    box = box / box.sum(axis=-1, keepdims=True)
    box = (box * np.arange(16, dtype=np.float32)).sum(axis=-1)  # (H, W, 4) ltrb
    return box


def nms(boxes, scores, iou_thresh):
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0, xx2 - xx1) * np.maximum(0, yy2 - yy1)
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        order = order[1:][iou < iou_thresh]
    return keep


def decode_outputs(outputs, orig_w, orig_h, scale, pad, crop_offset=(0, 0)):
    all_boxes, all_scores, all_cls = [], [], []
    pad_x, pad_y = pad

    for box_key, cls_key, stride in SCALES:
        box_raw = outputs[box_key][0]   # (H, W, 64) float32
        cls_raw = outputs[cls_key][0]   # (H, W, 10) float32
        H, W = box_raw.shape[:2]

        ltrb = dfl_decode(box_raw) * stride

        cls_scores = cls_raw  # sigmoid already applied by HEF
        conf = cls_scores.max(axis=-1)
        cls_id = cls_scores.argmax(axis=-1)

        # use lower threshold for fire/smoke classes
        thresh_map = np.where(np.isin(cls_id, list(FIRE_CLASSES)), FIRE_THRESH, CONF_THRESH)
        mask = conf > thresh_map
        if not mask.any():
            continue

        gy, gx = np.meshgrid(np.arange(H), np.arange(W), indexing='ij')
        cx = (gx + 0.5) * stride
        cy = (gy + 0.5) * stride

        x1 = (cx - ltrb[..., 0])[mask]
        y1 = (cy - ltrb[..., 1])[mask]
        x2 = (cx + ltrb[..., 2])[mask]
        y2 = (cy + ltrb[..., 3])[mask]

        # remove letterbox padding, scale back, then add crop offset
        x1 = (x1 - pad_x) / scale + crop_offset[0]
        x2 = (x2 - pad_x) / scale + crop_offset[0]
        y1 = (y1 - pad_y) / scale + crop_offset[1]
        y2 = (y2 - pad_y) / scale + crop_offset[1]

        all_boxes.append(np.stack([x1, y1, x2, y2], axis=1))
        all_scores.append(conf[mask])
        all_cls.append(cls_id[mask])

    if not all_boxes:
        return []

    boxes  = np.concatenate(all_boxes)
    scores = np.concatenate(all_scores)
    classes = np.concatenate(all_cls)

    keep = nms(boxes, scores, IOU_THRESH)
    return [(boxes[i], scores[i], classes[i]) for i in keep]


FIRE_DETECTION_CLASSES = {0, 1, 2}  # Ates, Fire, Fire Detection

def draw_detections(frame, detections):
    for (x1, y1, x2, y2), score, cls_id in detections:
        if cls_id not in FIRE_DETECTION_CLASSES:
            continue
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        label = f"Fire Detected {score:.2f}"
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
        (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(frame, (x1, y1 - lh - 6), (x1 + lw, y1), (0, 0, 255), -1)
        cv2.putText(frame, label, (x1, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)


def main():
    print("Initializing camera...")
    cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)
    if not cap.isOpened():
        raise RuntimeError("Could not open /dev/video0")
    time.sleep(1)

    print("Initializing Hailo...")
    hef = HEF(HEF_PATH)
    device = VDevice()
    configure_params = ConfigureParams.create_from_hef(hef, interface=HailoStreamInterface.PCIe)
    network_groups = device.configure(hef, configure_params)
    network_group = network_groups[0]
    ng_params = network_group.create_params()
    input_params  = InputVStreamParams.make(network_group, format_type=FormatType.UINT8)
    output_params = OutputVStreamParams.make(network_group, format_type=FormatType.FLOAT32)
    input_name = hef.get_input_vstream_infos()[0].name

    print("Running — press 'q' to quit, 's' to save snapshot")
    frame_count = 0
    t0 = time.time()

    with InferVStreams(network_group, input_params, output_params) as pipeline:
        with network_group.activate(ng_params):
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("Failed to grab frame")
                    break

                # center-crop to square before letterbox so small objects get more pixels
                h, w = frame.shape[:2]
                sq = min(h, w)
                x0, y0 = (w - sq) // 2, (h - sq) // 2
                cropped = frame[y0:y0+sq, x0:x0+sq]
                rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
                resized, scale, pad = letterbox(rgb)
                outputs = pipeline.infer({input_name: np.expand_dims(resized, axis=0)})

                frame_count += 1
                fps = frame_count / (time.time() - t0)

                display = frame.copy()
                orig_h, orig_w = display.shape[:2]

                detections = decode_outputs(outputs, orig_w, orig_h, scale, pad, crop_offset=(x0, y0))
                draw_detections(display, detections)

                display = cv2.rotate(display, cv2.ROTATE_90_COUNTERCLOCKWISE)

                cv2.putText(display, f"FPS: {fps:.1f}  det: {len(detections)}", (10, 35),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

                cv2.imshow("Pi Camera + Hailo 8", display)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    cv2.imwrite(SNAPSHOT_PATH, display)
                    print(f"Snapshot saved to {SNAPSHOT_PATH}")

    cap.release()
    cv2.destroyAllWindows()
    print(f"Done. {frame_count} frames at avg {fps:.1f} FPS")


if __name__ == "__main__":
    main()
                    