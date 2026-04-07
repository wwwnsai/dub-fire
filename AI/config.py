import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    rgb_cam: int
    thermal_cam: int
    enable_local_display: bool
    esp32_port: str
    esp32_baud: int
    sensor_status_api: str
    sensor_status_api_key: str
    stream_host: str
    stream_port: int
    model_path: str
    min_fire_area: int
    fire_temp_min: float
    send_interval: float
    shoot_confirm_time: float
    shoot_cooldown: float
    disarm_delay: float
    stream_fps: float
    jpeg_quality: int


def load_settings() -> Settings:
    return Settings(
        rgb_cam=int(os.getenv("RGB_CAM", "1")),
        thermal_cam=int(os.getenv("THERMAL_CAM", "2")),
        enable_local_display=os.getenv("ENABLE_LOCAL_DISPLAY", "1") == "1",
        esp32_port=os.getenv("ESP32_PORT", "COM9"),
        esp32_baud=int(os.getenv("ESP32_BAUD", "115200")),
        sensor_status_api=os.getenv("SENSOR_STATUS_API", "http://127.0.0.1:3000/api/sensor-status"),
        sensor_status_api_key=os.getenv("SENSOR_STATUS_API_KEY", ""),
        stream_host=os.getenv("STREAM_HOST", "0.0.0.0"),
        stream_port=int(os.getenv("STREAM_PORT", "5001")),
        model_path=os.getenv("MODEL_PATH", "models/best.pt"),
        min_fire_area=int(os.getenv("MIN_FIRE_AREA", "5")),
        fire_temp_min=float(os.getenv("FIRE_TEMP_MIN", "100.0")),
        send_interval=float(os.getenv("SEND_INTERVAL", "0.05")),
        shoot_confirm_time=float(os.getenv("SHOOT_CONFIRM_TIME", "2.0")),
        shoot_cooldown=float(os.getenv("SHOOT_COOLDOWN", "3.0")),
        disarm_delay=float(os.getenv("DISARM_DELAY", "5.0")),
        stream_fps=float(os.getenv("STREAM_FPS", "12")),
        jpeg_quality=int(os.getenv("JPEG_QUALITY", "80")),
    )
