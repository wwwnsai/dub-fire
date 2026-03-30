import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import cv2

from config import Settings


class StreamStore:
    def __init__(self, jpeg_quality: int):
        self.jpeg_quality = jpeg_quality
        self._rgb_frame = None
        self._thermal_frame = None
        self._sensor_snapshot = {}
        self._lock = threading.Lock()

    def update_rgb_frame(self, frame) -> None:
        encoded = self._encode_frame(frame)
        if encoded is None:
            return
        with self._lock:
            self._rgb_frame = encoded

    def update_thermal_frame(self, frame) -> None:
        encoded = self._encode_frame(frame)
        if encoded is None:
            return
        with self._lock:
            self._thermal_frame = encoded

    def update_sensor_snapshot(self, snapshot: dict) -> None:
        with self._lock:
            self._sensor_snapshot = dict(snapshot)

    def get_rgb_frame(self):
        with self._lock:
            return self._rgb_frame

    def get_thermal_frame(self):
        with self._lock:
            return self._thermal_frame

    def get_sensor_snapshot(self) -> dict:
        with self._lock:
            return dict(self._sensor_snapshot)

    def _encode_frame(self, frame):
        ok, encoded = cv2.imencode(
            ".jpg",
            frame,
            [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality],
        )
        return encoded.tobytes() if ok else None


class StreamHTTPServer(ThreadingHTTPServer):
    def __init__(self, server_address, request_handler_class, store: StreamStore, fps: float, command_handler=None):
        super().__init__(server_address, request_handler_class)
        self.store = store
        self.frame_interval = 1.0 / fps if fps > 0 else 0.03
        self.command_handler = command_handler


class StreamHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self._write_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/":
            self._write_index()
            return

        if path == "/rgb_feed":
            self._stream_frames(self.server.store.get_rgb_frame)
            return

        if path == "/thermal_feed":
            self._stream_frames(self.server.store.get_thermal_frame)
            return

        if path == "/sensor":
            self._write_sensor_snapshot()
            return

        self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path

        if path != "/control":
            self.send_error(404)
            return

        if self.server.command_handler is None:
            self._write_json({"error": "Control handler unavailable"}, 503)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._write_json({"error": "Invalid JSON body"}, 400)
            return

        action = payload.get("action")
        if not isinstance(action, str) or not action:
            self._write_json({"error": "Missing action"}, 400)
            return

        try:
            result = self.server.command_handler(action)
        except ValueError as exc:
            self._write_json({"error": str(exc)}, 400)
            return
        except Exception as exc:
            self._write_json({"error": f"Control failed: {exc}"}, 500)
            return

        self._write_json(result, 200)

    def _write_index(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            (
                "<html><body style='margin:0;background:#111;color:#fff;font-family:sans-serif;'>"
                "<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;'>"
                "<div><h3>RGB</h3><img src='/rgb_feed' style='width:100%;height:auto;display:block;'/></div>"
                "<div><h3>Thermal</h3><img src='/thermal_feed' style='width:100%;height:auto;display:block;'/></div>"
                "</div><pre id='sensor' style='padding:12px;'></pre>"
                "<script>setInterval(async()=>{const r=await fetch('/sensor');const j=await r.json();"
                "document.getElementById('sensor').textContent=JSON.stringify(j,null,2);},1000);</script>"
                "</body></html>"
            ).encode("utf-8")
        )

    def _write_sensor_snapshot(self):
        payload = json.dumps(self.server.store.get_sensor_snapshot()).encode("utf-8")
        self.send_response(200)
        self._write_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _write_json(self, data: dict, status_code: int):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self._write_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _write_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _stream_frames(self, frame_getter):
        self.send_response(200)
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.end_headers()

        try:
            while True:
                frame = frame_getter()
                if frame is None:
                    time.sleep(0.05)
                    continue

                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(frame)}\r\n\r\n".encode("utf-8"))
                self.wfile.write(frame)
                self.wfile.write(b"\r\n")
                time.sleep(self.server.frame_interval)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, format, *args):
        return


class StreamServer:
    def __init__(self, settings: Settings, store: StreamStore, command_handler=None):
        self.settings = settings
        self.server = StreamHTTPServer(
            (settings.stream_host, settings.stream_port),
            StreamHandler,
            store,
            settings.stream_fps,
            command_handler,
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def start(self) -> None:
        self.thread.start()
        print(
            f"Streams ready at http://127.0.0.1:{self.settings.stream_port}/rgb_feed, "
            f"/thermal_feed, /sensor"
        )

    def stop(self) -> None:
        self.server.shutdown()
        self.server.server_close()
