"""web_reporter.py — pushes sensor snapshots and fire-status to the web dashboard.

Used by serial_bridge.py (sensor data) and app.py (fire status).
All calls are fire-and-forget in background threads so they never block the main loop.
"""

import json
import threading
import time
import urllib.error
import urllib.request
from typing import Optional


class WebReporter:
    """Sends sensor and fire-status payloads to the Next.js API.

    Args:
        sensor_api:     Full URL of POST /api/sensor-status
        fire_api:       Full URL of POST /api/fire-status
        api_key:        Optional Bearer token for sensor-status auth
        sensor_min_interval: Minimum seconds between sensor pushes (rate-limit)
    """

    def __init__(
        self,
        sensor_api: str,
        fire_api: str,
        api_key: str = "",
        sensor_min_interval: float = 2.0,
    ):
        self._sensor_api = sensor_api
        self._fire_api = fire_api
        self._api_key = api_key
        self._sensor_min_interval = sensor_min_interval
        self._last_sensor_push = 0.0
        self._last_fire_status: Optional[str] = None  # avoid duplicate pushes

    # ── public interface ──────────────────────────────────────────────────────

    def push_sensor(
        self,
        temperature_c: Optional[float],
        humidity: Optional[float],
        imu_pitch: Optional[float],
        imu_roll: Optional[float],
        updated_at: Optional[str] = None,
        source: str = "esp32",
    ) -> None:
        """Push ESP32 sensor data. Rate-limited to sensor_min_interval seconds."""
        now = time.time()
        if now - self._last_sensor_push < self._sensor_min_interval:
            return
        self._last_sensor_push = now

        payload = {
            "temperatureC": temperature_c,
            "humidity": humidity,
            "imuPitch": imu_pitch,
            "imuRoll": imu_roll,
            "updatedAt": updated_at or time.strftime("%Y-%m-%dT%H:%M:%S"),
            "source": source,
        }
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        self._post_async(self._sensor_api, payload, headers, label="sensor")

    def push_fire_status(self, status: str) -> None:
        """Push fire status ('fire' or 'non-fire'). Skips if status hasn't changed."""
        if status == self._last_fire_status:
            return
        self._last_fire_status = status

        payload = {"status": status}
        headers = {"Content-Type": "application/json"}

        self._post_async(self._fire_api, payload, headers, label=f"fire-status({status})")

    # ── internals ─────────────────────────────────────────────────────────────

    def _post_async(self, url: str, payload: dict, headers: dict, label: str) -> None:
        threading.Thread(
            target=self._post,
            args=(url, payload, headers, label),
            daemon=True,
        ).start()

    @staticmethod
    def _post(url: str, payload: dict, headers: dict, label: str) -> None:
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=3) as resp:
                resp.read()
            print(f"[WebReporter] {label} → OK")
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            print(f"[WebReporter] {label} → failed: {exc}")
