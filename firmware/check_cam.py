import cv2
for i in range(5):
    cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
    if cap.isOpened():
        ret, f = cap.read()
        print(f"Cam {i}: dtype={f.dtype if ret else 'no frame'}, shape={f.shape if ret else '-'}")        
    cap.release()