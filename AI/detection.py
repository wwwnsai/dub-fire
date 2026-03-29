from dataclasses import dataclass

import cv2
import numpy as np


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


def detect_fire_rgb(frame, model) -> np.ndarray:
    results = model(frame, verbose=False)[0]
    height, width = frame.shape[:2]
    mask = np.zeros((height, width), dtype=np.uint8)

    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)

    return mask


def detect_fire_thermal(frame_raw: np.ndarray, fire_temp_min: float) -> tuple[np.ndarray, np.ndarray]:
    if frame_raw.shape[0] == 122:
        frame_raw = frame_raw[:120, :]
    elif frame_raw.shape[1] == 122:
        frame_raw = frame_raw[:, :120]

    temp_c = (frame_raw.astype(np.float32) / 100.0) - 273.15
    temp_c = np.clip(temp_c, -40, 500)

    median = cv2.medianBlur(temp_c.astype(np.float32), 3)
    hot_pixel = temp_c > fire_temp_min
    warm_area = median > 40.0

    mask = np.zeros(frame_raw.shape[:2], dtype=np.uint8)
    mask[hot_pixel & warm_area] = 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.dilate(mask, kernel, iterations=2)

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
    area = cv2.contourArea(largest)
    if area < min_fire_area:
        return None

    x, y, w, h = cv2.boundingRect(largest)
    cx = x + w // 2
    cy = y + h // 2

    return FireTarget(
        cx=cx,
        cy=cy,
        x=x,
        y=y,
        w=w,
        h=h,
        area=area,
        norm_x=(cx - frame_w / 2) / (frame_w / 2),
        norm_y=(cy - frame_h / 2) / (frame_h / 2),
    )
