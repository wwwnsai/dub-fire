import os
from dataclasses import dataclass

_HERE = os.path.dirname(os.path.abspath(__file__))


@dataclass(frozen=True)
class Settings:
    rgb_cam: int
    thermal_cam: str
    enable_local_display: bool
    esp32_port: str
    esp32_baud: int
    sensor_status_api: str
    sensor_status_api_key: str
    stream_host: str
    stream_port: int
    hef_path: str
    min_fire_area: int
    fire_temp_min: float
    thermal_y_offset: float
    pan_pos_scale: float
    pan_neg_scale: float
    y_bias: float
    x_bias: float
    send_interval: float
    shoot_confirm_time: float
    shoot_cooldown: float
    aim_threshold: float
    disarm_delay: float
    stream_fps: float
    jpeg_quality: int


def load_settings() -> Settings:
    return Settings(
        rgb_cam=int(os.getenv("RGB_CAM", "10")),
        thermal_cam=os.getenv("THERMAL_CAM", "/dev/thermal"),
        enable_local_display=os.getenv("ENABLE_LOCAL_DISPLAY", "1") == "1",
        esp32_port=os.getenv("ESP32_PORT", "/dev/ttyUSB0"),
        esp32_baud=int(os.getenv("ESP32_BAUD", "115200")),
        sensor_status_api=os.getenv("SENSOR_STATUS_API", "http://127.0.0.1:3000/api/sensor-status"),
        sensor_status_api_key=os.getenv("SENSOR_STATUS_API_KEY", ""),
        stream_host=os.getenv("STREAM_HOST", "0.0.0.0"),
        stream_port=int(os.getenv("STREAM_PORT", "5001")),
        hef_path=os.getenv("HEF_PATH", os.path.join(_HERE, "../converted/yolov8n_10cls.hef")),
        min_fire_area=int(os.getenv("MIN_FIRE_AREA", "5")),
        fire_temp_min=float(os.getenv("FIRE_TEMP_MIN", "45.0")),
        thermal_y_offset=float(os.getenv("THERMAL_Y_OFFSET", "0.30")),
        pan_pos_scale=float(os.getenv("PAN_POS_SCALE", "2.2")),   # boost when fire is right (norm_x > 0)
        pan_neg_scale=float(os.getenv("PAN_NEG_SCALE", "1.0")),   # boost when fire is left  (norm_x < 0)
        y_bias=float(os.getenv("Y_BIAS", "0.19")),
        x_bias=float(os.getenv("X_BIAS", "0.0")),
        send_interval=float(os.getenv("SEND_INTERVAL", "0.05")),
        shoot_confirm_time=float(os.getenv("SHOOT_CONFIRM_TIME", "1.0")),
        shoot_cooldown=float(os.getenv("SHOOT_COOLDOWN", "2.0")),
        aim_threshold=float(os.getenv("AIM_THRESHOLD", "0.25")),
        disarm_delay=float(os.getenv("DISARM_DELAY", "1.0")),
        stream_fps=float(os.getenv("STREAM_FPS", "8")),
        jpeg_quality=int(os.getenv("JPEG_QUALITY", "80")),
    )
