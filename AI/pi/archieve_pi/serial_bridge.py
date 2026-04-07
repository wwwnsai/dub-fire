import json
import re
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass

import serial

from config import Settings


@dataclass
class SensorSnapshot:
    temperature_c: float | None = None
    humidity: float | None = None
    imu_pitch: float | None = None
    imu_roll: float | None = None
    tof_distance_mm: int = -1
    updated_at: str | None = None
    source: str = "esp32-debug"


class ESP32Bridge:
    temp_humidity_pattern = re.compile(r"T:(-?\d+(?:\.\d+)?)C\s+H:(-?\d+(?:\.\d+)?)%")
    imu_pattern = re.compile(r"\bP:(-?\d+(?:\.\d+)?)\s+R:(-?\d+(?:\.\d+)?)")
    tof_pattern = re.compile(r"\bD:(-?\d+)mm")

    def __init__(self, settings: Settings):
        self.settings = settings
        self.serial_conn = None
        self.last_send_time = 0.0
        self.last_sensor_push_time = 0.0
        self.snapshot = SensorSnapshot()
        self._connect()

    def _connect(self) -> None:
        try:
            self.serial_conn = serial.Serial(
                self.settings.esp32_port,
                self.settings.esp32_baud,
                timeout=0.01,
            )
            time.sleep(3)
            # flush any boot garbage
            self.serial_conn.reset_input_buffer()
            self.force_send("T:1\n")
            time.sleep(0.1)
            self.force_send("T:1\n")   # send twice — first may be swallowed by boot
            print(f"ESP32 connected on {self.settings.esp32_port}")
            print(">> Tracking enabled, waiting for fire to arm")
        except Exception:
            self.serial_conn = None
            print("WARNING: ESP32 not connected")

    def send(self, message: str) -> None:
        now = time.time()
        if now - self.last_send_time < self.settings.send_interval:
            return
        self.last_send_time = now
        self._write(message)

    def force_send(self, message: str) -> None:
        self._write(message)

    def _write(self, message: str) -> None:
        if not self.serial_conn or not self.serial_conn.is_open:
            return
        try:
            self.serial_conn.write(message.encode())
        except Exception:
            pass

    def poll(self) -> None:
        if not self.serial_conn or not self.serial_conn.is_open:
            return

        while self.serial_conn.in_waiting:
            try:
                line = self.serial_conn.readline().decode("utf-8", errors="ignore").strip()
                if not line:
                    continue

                print(f"[ESP32] {line}")
                self._parse_imu(line)
                self._parse_environment(line)
                self._parse_tof(line)
            except Exception:
                pass

    def _parse_imu(self, line: str) -> None:
        match = self.imu_pattern.search(line)
        if not match:
            return

        self.snapshot.imu_pitch = float(match.group(1))
        self.snapshot.imu_roll = float(match.group(2))

    def _parse_tof(self, line: str) -> None:
        match = self.tof_pattern.search(line)
        if match:
            self.snapshot.tof_distance_mm = int(match.group(1))

    def _parse_environment(self, line: str) -> None:
        match = self.temp_humidity_pattern.search(line)
        if not match:
            return

        self.snapshot.temperature_c = float(match.group(1))
        self.snapshot.humidity = float(match.group(2))
        self.snapshot.updated_at = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())
        self._push_sensor_status_if_due()

    def _push_sensor_status_if_due(self) -> None:
        now = time.time()
        if now - self.last_sensor_push_time < 0.5:
            return

        payload = {
            "temperatureC": self.snapshot.temperature_c,
            "humidity": self.snapshot.humidity,
            "imuPitch": self.snapshot.imu_pitch,
            "imuRoll": self.snapshot.imu_roll,
            "updatedAt": self.snapshot.updated_at,
            "source": self.snapshot.source,
        }

        headers: dict = {"Content-Type": "application/json"}
        if self.settings.sensor_status_api_key:
            headers["Authorization"] = f"Bearer {self.settings.sensor_status_api_key}"

        request = urllib.request.Request(
            self.settings.sensor_status_api,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=0.5) as response:
                response.read()
            self.last_sensor_push_time = now
        except (urllib.error.URLError, TimeoutError, OSError):
            pass

    def snapshot_dict(self) -> dict:
        return asdict(self.snapshot)

    def close(self) -> None:
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
