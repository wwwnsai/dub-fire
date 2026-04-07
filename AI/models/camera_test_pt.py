import os
import time
import cv2
import numpy as np
from picamera2 import Picamera2
from ultralytics import YOLO

MODEL_PATH = "/home/ai/Desktop/projects/dub-fire/AI/models/best.pt"
CONF_THRESH = 0.5
SNAPSHOT_PATH = "/home/ai/Desktop/projects/dub-fire/AI/models/snapshot_pt.jpg"

COLORS = [
    (0, 80, 255), (0, 0, 255), (0, 30, 255), (0, 60, 255),
    (255, 165, 0), (255, 0, 180), (128, 0, 255), (0, 200, 0),
    (255, 50, 50), (100, 100, 255)
]

os.environ.setdefault("QT_QPA_PLATFORM", "wayland")


def draw_detections(frame, results):
    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        conf = float(box.conf[0])
        cls_id = int(box.cls[0])
        label = f"{results.names[cls_id]} {conf:.2f}"
        color = COLORS[cls_id % len(COLORS)]

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(frame, (x1, y1 - lh - 6), (x1 + lw, y1), color, -1)
        cv2.putText(frame, label, (x1, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)


def main():
    print("Loading model...")
    model = YOLO(MODEL_PATH)

    print("Initializing camera...")
    picam2 = Picamera2()
    config = picam2.create_preview_configuration(main={"size": (1280, 720), "format": "RGB888"})
    picam2.configure(config)
    picam2.start()
    time.sleep(1)

    print("Running — press 'q' to quit, 's' to save snapshot")
    frame_count = 0
    t0 = time.time()

    while True:
        frame = picam2.capture_array()  # RGB

        results = model(frame, conf=CONF_THRESH, verbose=False)[0]

        frame_count += 1
        fps = frame_count / (time.time() - t0)

        display = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        display = cv2.rotate(display, cv2.ROTATE_90_CLOCKWISE)

        # scale boxes to rotated frame
        dh, dw = display.shape[:2]
        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            # rotate coords: (x,y) on 1280x720 -> (720-y, x) on 720x1280
            rx1, ry1 = 720 - y2, x1
            rx2, ry2 = 720 - y1, x2
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            label = f"{results.names[cls_id]} {conf:.2f}"
            color = COLORS[cls_id % len(COLORS)]
            cv2.rectangle(display, (rx1, ry1), (rx2, ry2), color, 2)
            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(display, (rx1, ry1 - lh - 6), (rx1 + lw, ry1), color, -1)
            cv2.putText(display, label, (rx1, ry1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        cv2.putText(display, f"FPS: {fps:.1f}  [PT model]", (10, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        cv2.imshow("Pi Camera + YOLOv8 (.pt)", display)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            cv2.imwrite(SNAPSHOT_PATH, display)
            print(f"Snapshot saved to {SNAPSHOT_PATH}")

    picam2.stop()
    cv2.destroyAllWindows()
    print(f"Done. {frame_count} frames at avg {fps:.1f} FPS")


if __name__ == "__main__":
    main()
