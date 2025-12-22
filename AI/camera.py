import cv2
from ultralytics import YOLO

# Load your trained model
model = YOLO("best_use_4Oct.pt")

# Open webcam
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Run YOLO detection on each frame
    results = model(frame)

    # Draw bounding boxes
    annotated_frame = results[0].plot()

    # Show frame
    cv2.imshow("🔥 Fire Detection", annotated_frame)

    # Press 'q' to exit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

# Release resources
cap.release()
cv2.destroyAllWindows()
