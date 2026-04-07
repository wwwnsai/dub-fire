import time
import numpy as np
import cv2
from picamera2 import Picamera2
from hailo_platform import (
    HEF, VDevice, HailoStreamInterface,
    InferVStreams, ConfigureParams,
    InputVStreamParams, OutputVStreamParams, FormatType
)

HEF_PATH = "/home/ai/Desktop/projects/dub-fire/AI/models/converted/yolov8n_10cls.hef"

picam2 = Picamera2()
picam2.configure(picam2.create_preview_configuration(main={"size": (1280, 720), "format": "RGB888"}))
picam2.start()
time.sleep(1)
frame = picam2.capture_array()
picam2.stop()

resized = cv2.resize(frame, (640, 640))

hef = HEF(HEF_PATH)
device = VDevice()
cfg = ConfigureParams.create_from_hef(hef, interface=HailoStreamInterface.PCIe)
ng = device.configure(hef, cfg)[0]
input_params  = InputVStreamParams.make(ng, format_type=FormatType.UINT8)
output_params = OutputVStreamParams.make(ng, format_type=FormatType.FLOAT32)
input_name = hef.get_input_vstream_infos()[0].name

with InferVStreams(ng, input_params, output_params) as pipeline:
    with ng.activate(ng.create_params()):
        out = pipeline.infer({input_name: np.expand_dims(resized, 0)})

print("\n--- Output tensor stats ---")
for name, t in sorted(out.items()):
    arr = t[0]  # remove batch dim
    sig = 1.0 / (1.0 + np.exp(-arr))
    if arr.shape[-1] == 10:
        max_cls_score = sig.max(axis=-1)
        above = (max_cls_score > 0.3).sum()
        print(f"{name}: shape={arr.shape}  raw=[{arr.min():.3f}, {arr.max():.3f}]  "
              f"sig_max={sig.max():.3f}  cells_above_0.3={above}")
    else:
        print(f"{name}: shape={arr.shape}  raw=[{arr.min():.3f}, {arr.max():.3f}]  mean={arr.mean():.3f}")
