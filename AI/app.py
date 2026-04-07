import time
from dataclasses import dataclass, replace
import threading

import cv2
import numpy as np
from ultralytics import YOLO

from config import Settings, load_settings
from detection import FireTarget, detect_fire_rgb, detect_fire_thermal, get_fire_target, temp_to_colormap
from serial_bridge import ESP32Bridge
from stream_server import StreamServer, StreamStore


@dataclass
class RuntimeState:
    auto_track: bool = True
    is_armed: bool = False
    auto_shoot: bool = True
    feeder_on: bool = False
    fire_confirm_start: float = 0.0
    fire_confirmed_duration: float = 0.0
    last_shoot_time: float = 0.0
    last_fire_seen_time: float = 0.0
    shot_count: int = 0
    emergency_stop: bool = False
    fps_time: float = 0.0
    fps_count: int = 0
    fps: int = 0
    manual_override_until: float = 0.0


class FireDetectionApp:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or load_settings()
        self.model = YOLO(self.settings.model_path)
        self.bridge = ESP32Bridge(self.settings)
        self.stream_store = StreamStore(self.settings.jpeg_quality)
        self.state_lock = threading.RLock()
        self.stream_server = StreamServer(self.settings, self.stream_store, self.handle_command)
        self.state = RuntimeState(fps_time=time.time())

    def run(self) -> None:
        self.stream_store.set_control_handler(self._apply_control)
        self.stream_server.start()

        rgb_cap = cv2.VideoCapture(self.settings.rgb_cam)
        thermal_cap = cv2.VideoCapture(self.settings.thermal_cam, cv2.CAP_DSHOW)
        thermal_cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"Y16 "))
        thermal_cap.set(cv2.CAP_PROP_CONVERT_RGB, 0)

        if not rgb_cap.isOpened():
            print(f"ERROR: Cannot open RGB camera {self.settings.rgb_cam}")
            return
        if not thermal_cap.isOpened():
            print(f"ERROR: Cannot open thermal camera {self.settings.thermal_cam}")
            rgb_cap.release()
            return

        self._announce_startup(thermal_cap)

        try:
            self._run_loop(rgb_cap, thermal_cap)
        finally:
            rgb_cap.release()
            thermal_cap.release()
            self.bridge.close()
            self.stream_server.stop()
            if self.settings.enable_local_display:
                cv2.destroyAllWindows()

    def _announce_startup(self, thermal_cap) -> None:
        ret, test_frame = thermal_cap.read()
        if ret and test_frame.dtype == np.uint16:
            print(f"Thermal: RADIOMETRIC MODE ({test_frame.shape})")
        else:
            print("WARNING: Thermal not in Y16 mode")

        print("=== Fire Detection System (AUTO MODE) ===")
        print("  System starts SAFE - auto-arms when fire detected")
        print("  q-Quit  d-EMERGENCY STOP  s-Shoot ON  x-Shoot OFF")
        print("  t-Temp UP  g-Temp DOWN")
        print(
            f"  Shoot: BOTH confirm, {self.settings.shoot_confirm_time}s wait, "
            f"{self.settings.shoot_cooldown}s cooldown"
        )
        print(f"  Auto-disarm {self.settings.disarm_delay}s after fire gone")

        if self.settings.enable_local_display:
            cv2.namedWindow("Fire Detection System", cv2.WINDOW_NORMAL)
            cv2.resizeWindow("Fire Detection System", 1280, 960)

    def _run_loop(self, rgb_cap, thermal_cap) -> None:
        while True:
            ok_rgb, rgb_frame = rgb_cap.read()
            ok_thermal, thermal_raw = thermal_cap.read()

            if not ok_rgb:
                print("RGB camera read failed")
                break

            rgb_frame = cv2.rotate(rgb_frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
            frame_h, frame_w = rgb_frame.shape[:2]
            half_h = frame_h // 2
            half_w = frame_w // 2

            rgb_mask = detect_fire_rgb(rgb_frame, self.model)
            rgb_target = get_fire_target(rgb_mask, frame_w, frame_h, self.settings.min_fire_area)

            thermal_info = self._process_thermal_frame(ok_thermal, thermal_raw)
            fire_status = self._evaluate_fire_status(rgb_target, thermal_info["target"], thermal_info["max_temp"])

            self._update_arming_state(fire_status["both_confirmed"])
            self._update_shoot_timer(fire_status["both_confirmed"])
            self._handle_auto_shoot(
                fire_status["both_confirmed"],
                thermal_info["target"],
                thermal_info["max_temp"],
            )
            self._send_tracking_command(fire_status["fire_confirmed"], thermal_info["target"])

            self.bridge.poll()
            self._update_fps()
            self.stream_store.update_sensor_snapshot(self._build_sensor_snapshot())

            display_rgb = self._build_rgb_display(
                rgb_frame,
                rgb_target,
                thermal_info["target"],
                thermal_info["temp_c"],
                thermal_info["max_temp"],
                fire_status,
            )
            rgb_mask_color = self._build_rgb_mask_view(rgb_mask)
            thermal_views = self._build_thermal_views(
                thermal_info["display"],
                thermal_info["mask"],
                half_w,
                half_h,
            )

            combined = np.vstack(
                [
                    np.hstack([cv2.resize(display_rgb, (half_w, half_h)), thermal_views["display"]]),
                    np.hstack([cv2.resize(rgb_mask_color, (half_w, half_h)), thermal_views["mask"]]),
                ]
            )

            self.stream_store.update_rgb_frame(display_rgb)
            self.stream_store.update_thermal_frame(thermal_views["stream"])

            if self.settings.enable_local_display:
                cv2.imshow("Fire Detection System", combined)

            if self._handle_key_input():
                break

    def _process_thermal_frame(self, ok_thermal: bool, thermal_raw):
        info = {
            "target": None,
            "mask": None,
            "display": None,
            "temp_c": None,
            "max_temp": 0.0,
        }

        if not ok_thermal or thermal_raw is None or thermal_raw.dtype != np.uint16:
            return info

        if thermal_raw.shape[0] == 122:
            thermal_raw = thermal_raw[:120, :]

        thermal_raw = cv2.rotate(thermal_raw, cv2.ROTATE_90_CLOCKWISE)
        thermal_mask, temp_c = detect_fire_thermal(thermal_raw, self.settings.fire_temp_min)
        height, width = temp_c.shape[:2]
        thermal_target = get_fire_target(thermal_mask, width, height, self.settings.min_fire_area)
        max_temp = float(np.max(temp_c))
        thermal_display = temp_to_colormap(temp_c)

        if thermal_target:
            cv2.rectangle(
                thermal_display,
                (thermal_target.x, thermal_target.y),
                (thermal_target.x + thermal_target.w, thermal_target.y + thermal_target.h),
                (0, 255, 0),
                1,
            )
            cv2.circle(thermal_display, (thermal_target.cx, thermal_target.cy), 3, (0, 255, 0), -1)

        cv2.putText(thermal_display, f"Max:{max_temp:.0f}C", (2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1)
        cv2.putText(
            thermal_display,
            f"Thr:{self.settings.fire_temp_min:.0f}C",
            (2, 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.35,
            (0, 255, 255),
            1,
        )

        info.update(
            {
                "target": thermal_target,
                "mask": thermal_mask,
                "display": thermal_display,
                "temp_c": temp_c,
                "max_temp": max_temp,
            }
        )
        return info

    def _build_sensor_snapshot(self) -> dict:
        snapshot = self.bridge.snapshot_dict()
        with self.state_lock:
            tof_mm = self.bridge.snapshot.tof_distance_mm
            snapshot.update(
                {
                    "isArmed": self.state.is_armed,
                    "autoTrack": self.state.auto_track,
                    "autoShoot": self.state.auto_shoot,
                    "feederOn": self.state.feeder_on,
                    "emergencyStop": self.state.emergency_stop,
                    "shotCount": self.state.shot_count,
                    "fireTempMin": self.settings.fire_temp_min,
                    "fps": self.state.fps,
                    "tofDistanceMm": tof_mm,
                    "tofDistanceM": round(tof_mm / 1000, 3) if tof_mm is not None else None,
                }
            )
        return snapshot

    def handle_command(self, action: str) -> dict:
        now = time.time()

        with self.state_lock:
            if action == "arm":
                self.state.emergency_stop = False
                self.state.is_armed = True
                self.bridge.force_send("A:1\n")
            elif action == "disarm":
                self.state.is_armed = False
                self.state.shot_count = 0
                self.bridge.force_send("A:0\n")
            elif action == "track_on":
                self.state.emergency_stop = False
                self.state.auto_track = True
                self.bridge.force_send("T:1\n")
            elif action == "track_off":
                self.state.auto_track = False
                self.bridge.force_send("T:0\n")
            elif action == "shoot_on":
                self.state.emergency_stop = False
                self.state.auto_shoot = True
            elif action == "shoot_off":
                self.state.auto_shoot = False
            elif action == "shoot_now":
                self.state.emergency_stop = False
                self.state.last_shoot_time = now
                self.state.shot_count += 1
                self.bridge.force_send("S:1\n")
            elif action == "emergency_stop":
                self.state.emergency_stop = True
                self.state.is_armed = False
                self.state.auto_shoot = False
                self.bridge.force_send("A:0\n")
                self.bridge.force_send("T:0\n")
            elif action == "resume":
                self.state.emergency_stop = False
                self.state.auto_track = True
                self.state.auto_shoot = True
                self.bridge.force_send("T:1\n")
            elif action == "temp_up":
                self.settings = replace(self.settings, fire_temp_min=min(500, self.settings.fire_temp_min + 10))
            elif action == "temp_down":
                self.settings = replace(self.settings, fire_temp_min=max(50, self.settings.fire_temp_min - 10))
            elif action == "pan_left":
                self._queue_manual_nudge(-0.9, 0.0)
            elif action == "pan_right":
                self._queue_manual_nudge(0.9, 0.0)
            elif action == "tilt_up":
                self._queue_manual_nudge(0.0, -0.9)
            elif action == "tilt_down":
                self._queue_manual_nudge(0.0, 0.9)
            elif action == "feeder_on":
                self.state.feeder_on = True
                self.bridge.force_send("FD:1\n")
            elif action == "feeder_off":
                self.state.feeder_on = False
                self.bridge.force_send("FD:0\n")
            else:
                raise ValueError(f"Unsupported action: {action}")

            snapshot = self._build_sensor_snapshot()

        return {"ok": True, "action": action, "state": snapshot}

    def _queue_manual_nudge(self, norm_x: float, norm_y: float, duration: float = 0.18) -> None:
        previous_auto_track = self.state.auto_track
        self.state.manual_override_until = time.time() + duration
        thread = threading.Thread(
            target=self._run_manual_nudge,
            args=(norm_x, norm_y, duration, previous_auto_track),
            daemon=True,
        )
        thread.start()

    def _run_manual_nudge(self, norm_x: float, norm_y: float, duration: float, previous_auto_track: bool) -> None:
        self.bridge.force_send("T:1\n")
        self.bridge.force_send(f"F:{norm_x:.3f},{norm_y:.3f}\n")
        time.sleep(duration)
        self.bridge.force_send("F:NONE\n")
        self.bridge.force_send("T:1\n" if previous_auto_track else "T:0\n")

    def _evaluate_fire_status(self, rgb_target, thermal_target, max_temp: float):
        if thermal_target is not None and rgb_target is not None:
            return {
                "status": "FIRE DETECTED!",
                "color": (0, 0, 255),
                "fire_confirmed": True,
                "both_confirmed": True,
            }
        if thermal_target is not None:
            return {
                "status": f"THERMAL ALERT ({max_temp:.0f}C)",
                "color": (0, 165, 255),
                "fire_confirmed": True,
                "both_confirmed": False,
            }
        if rgb_target is not None:
            return {
                "status": "FALSE ALARM (no heat)",
                "color": (0, 255, 255),
                "fire_confirmed": False,
                "both_confirmed": False,
            }
        return {
            "status": "No fire",
            "color": (0, 255, 0),
            "fire_confirmed": False,
            "both_confirmed": False,
        }

    def _update_arming_state(self, both_confirmed: bool) -> None:
        now = time.time()
        if self.state.emergency_stop:
            return

        if both_confirmed:
            self.state.last_fire_seen_time = now
            if not self.state.is_armed:
                self.state.is_armed = True
                self.bridge.force_send("A:1\n")
                print(">> AUTO-ARM: fire confirmed!")
            return

        if self.state.is_armed and now - self.state.last_fire_seen_time > self.settings.disarm_delay:
            self.state.is_armed = False
            self.state.shot_count = 0
            self.bridge.force_send("A:0\n")
            print(f">> AUTO-DISARM: no fire for {self.settings.disarm_delay}s")

    def _update_shoot_timer(self, both_confirmed: bool) -> None:
        now = time.time()
        if both_confirmed:
            if self.state.fire_confirm_start == 0:
                self.state.fire_confirm_start = now
            self.state.fire_confirmed_duration = now - self.state.fire_confirm_start
        else:
            self.state.fire_confirm_start = 0
            self.state.fire_confirmed_duration = 0

    def _handle_auto_shoot(self, both_confirmed: bool, thermal_target: FireTarget | None, max_temp: float) -> None:
        if thermal_target is None:
            return

        now = time.time()
        target_centered = abs(thermal_target.norm_x) < 0.3 and abs(thermal_target.norm_y) < 0.3
        can_shoot = (
            self.state.auto_shoot
            and self.state.is_armed
            and not self.state.emergency_stop
            and both_confirmed
            and self.state.fire_confirmed_duration >= self.settings.shoot_confirm_time
            and (now - self.state.last_shoot_time) >= self.settings.shoot_cooldown
            and target_centered
        )

        if can_shoot:
            self.bridge.force_send("S:1\n")
            self.state.last_shoot_time = now
            self.state.shot_count += 1
            print(f">>>>> SHOT FIRED! (#{self.state.shot_count}, temp={max_temp:.0f}C) <<<<<")
            threading.Thread(target=self._feeder_sequence, daemon=True).start()

    def _feeder_sequence(self) -> None:
        time.sleep(3.0)                   # wait 3 seconds before feeding
        self.bridge.force_send("FD:1\n")  # push ball
        print(">> FEEDER PUSH")
        time.sleep(0.8)                   # hold at push position
        self.bridge.force_send("FD:0\n")  # return to home
        print(">> FEEDER RETURN")

    def _send_tracking_command(self, fire_confirmed: bool, thermal_target: FireTarget | None) -> None:
        if self.state.manual_override_until > time.time():
            return

        if fire_confirmed and thermal_target is not None:
            self.bridge.send(f"F:{thermal_target.norm_x:.3f},{thermal_target.norm_y:.3f}\n")
        else:
            self.bridge.send("F:NONE\n")

    def _update_fps(self) -> None:
        self.state.fps_count += 1
        now = time.time()
        if now - self.state.fps_time >= 1.0:
            self.state.fps = self.state.fps_count
            self.state.fps_count = 0
            self.state.fps_time = now

    def _build_rgb_display(self, rgb_frame, rgb_target, thermal_target, temp_c, max_temp: float, fire_status):
        display_rgb = rgb_frame.copy()
        if rgb_target:
            color = fire_status["color"]
            cv2.rectangle(
                display_rgb,
                (rgb_target.x, rgb_target.y),
                (rgb_target.x + rgb_target.w, rgb_target.y + rgb_target.h),
                color,
                2,
            )
            cv2.circle(display_rgb, (rgb_target.cx, rgb_target.cy), 6, color, -1)
            cv2.line(display_rgb, (rgb_target.cx - 15, rgb_target.cy), (rgb_target.cx + 15, rgb_target.cy), color, 1)
            cv2.line(display_rgb, (rgb_target.cx, rgb_target.cy - 15), (rgb_target.cx, rgb_target.cy + 15), color, 1)

        cv2.putText(display_rgb, fire_status["status"], (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, fire_status["color"], 2)

        if fire_status["fire_confirmed"] and thermal_target:
            cv2.putText(
                display_rgb,
                f"Track: ({thermal_target.norm_x:.2f}, {thermal_target.norm_y:.2f})",
                (10, 55),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 255),
                1,
            )

        temp_text = f"Max:{max_temp:.0f}C (thr:{self.settings.fire_temp_min:.0f}C)" if temp_c is not None else "Thermal: --"
        cv2.putText(display_rgb, temp_text, (10, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
        self._draw_shoot_status(display_rgb, fire_status["both_confirmed"], thermal_target)
        self._draw_bottom_status(display_rgb)
        return display_rgb

    def _draw_shoot_status(self, display_rgb, both_confirmed: bool, thermal_target: FireTarget | None) -> None:
        now = time.time()
        shoot_y = 95

        if self.state.emergency_stop:
            shoot_text = "EMERGENCY STOP (press 'a' to resume)"
            shoot_color = (0, 0, 255)
        elif self.state.auto_shoot and self.state.is_armed:
            if both_confirmed:
                remaining = max(0, self.settings.shoot_confirm_time - self.state.fire_confirmed_duration)
                cooldown = max(0, self.settings.shoot_cooldown - (now - self.state.last_shoot_time))
                target_centered = thermal_target is not None and abs(thermal_target.norm_x) < 0.3 and abs(thermal_target.norm_y) < 0.3
                if remaining > 0:
                    shoot_text = f"CONFIRMING: {remaining:.1f}s"
                    shoot_color = (0, 165, 255)
                elif not target_centered:
                    shoot_text = "AIMING..."
                    shoot_color = (0, 165, 255)
                elif cooldown > 0 and self.state.last_shoot_time > 0:
                    shoot_text = f"COOLDOWN: {cooldown:.1f}s"
                    shoot_color = (255, 165, 0)
                else:
                    shoot_text = ">>> FIRING <<<"
                    shoot_color = (0, 0, 255)
            elif self.state.last_fire_seen_time > 0:
                disarm_in = max(0, self.settings.disarm_delay - (now - self.state.last_fire_seen_time))
                shoot_text = f"ARMED (disarm in {disarm_in:.0f}s)"
                shoot_color = (0, 165, 255)
            else:
                shoot_text = "SCANNING..."
                shoot_color = (150, 150, 150)
        elif self.state.auto_shoot:
            shoot_text = "SCANNING... (auto-arm on fire)"
            shoot_color = (150, 150, 150)
        else:
            shoot_text = "AUTO-SHOOT OFF"
            shoot_color = (100, 100, 100)

        cv2.putText(display_rgb, shoot_text, (10, shoot_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, shoot_color, 1)
        if self.state.shot_count > 0:
            cv2.putText(display_rgb, f"Shots: {self.state.shot_count}", (10, shoot_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    def _draw_bottom_status(self, display_rgb) -> None:
        frame_h = display_rgb.shape[0]
        info_y = frame_h - 10
        bridge_ok = self.bridge.serial_conn is not None and self.bridge.serial_conn.is_open

        cv2.putText(display_rgb, f"FPS:{self.state.fps}", (10, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        cv2.putText(display_rgb, "ESP32:OK" if bridge_ok else "ESP32:--", (80, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0) if bridge_ok else (0, 0, 255), 1)
        cv2.putText(display_rgb, "ARMED" if self.state.is_armed else "SAFE", (170, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255) if self.state.is_armed else (0, 255, 0), 1)
        cv2.putText(display_rgb, "TRK:ON" if self.state.auto_track else "TRK:OFF", (240, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255) if self.state.auto_track else (150, 150, 150), 1)
        cv2.putText(display_rgb, "SHOOT:ON" if self.state.auto_shoot else "SHOOT:OFF", (330, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255) if self.state.auto_shoot else (150, 150, 150), 1)
        if self.state.emergency_stop:
            cv2.putText(display_rgb, "E-STOP", (430, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)

    def _build_rgb_mask_view(self, rgb_mask):
        rgb_mask_color = cv2.cvtColor(rgb_mask, cv2.COLOR_GRAY2BGR)
        cv2.putText(rgb_mask_color, "YOLO Mask", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        return rgb_mask_color

    def _build_thermal_views(self, thermal_display, thermal_mask, half_w: int, half_h: int):
        if thermal_display is not None and thermal_mask is not None:
            thermal_show = cv2.resize(thermal_display, (half_w, half_h))
            thermal_mask_show = cv2.cvtColor(cv2.resize(thermal_mask, (half_w, half_h)), cv2.COLOR_GRAY2BGR)
            cv2.putText(thermal_show, "Thermal (tracking)", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
            cv2.putText(thermal_mask_show, "Thermal Mask", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            stream_thermal = thermal_display.copy()
        else:
            thermal_show = np.zeros((half_h, half_w, 3), dtype=np.uint8)
            thermal_mask_show = np.zeros((half_h, half_w, 3), dtype=np.uint8)
            stream_thermal = np.zeros((half_h, half_w, 3), dtype=np.uint8)

        return {"display": thermal_show, "mask": thermal_mask_show, "stream": stream_thermal}

    def _current_state_dict(self) -> dict:
        return {
            "isArmed": self.state.is_armed,
            "autoTrack": self.state.auto_track,
            "autoShoot": self.state.auto_shoot,
            "feederOn": self.state.feeder_on,
            "emergencyStop": self.state.emergency_stop,
            "shotCount": self.state.shot_count,
            "fireTempMin": self.settings.fire_temp_min,
            "fps": self.state.fps,
        }

    def _apply_control(self, action: str) -> dict:
        if action == "arm":
            self.state.is_armed = True
            self.bridge.force_send("A:1\n")
        elif action == "disarm":
            self.state.is_armed = False
            self.bridge.force_send("A:0\n")
        elif action == "track_on":
            self.state.auto_track = True
            self.bridge.force_send("T:1\n")
        elif action == "track_off":
            self.state.auto_track = False
            self.bridge.force_send("T:0\n")
        elif action == "shoot_on":
            self.state.auto_shoot = True
            self.state.emergency_stop = False
        elif action == "shoot_off":
            self.state.auto_shoot = False
        elif action == "shoot_now":
            self.bridge.force_send("S:1\n")
            self.state.shot_count += 1
        elif action == "emergency_stop":
            self.state.emergency_stop = True
            self.state.is_armed = False
            self.state.auto_shoot = False
            self.bridge.force_send("A:0\n")
            self.bridge.force_send("T:0\n")
        elif action == "resume":
            self.state.emergency_stop = False
            self.state.auto_track = True
            self.state.auto_shoot = True
            self.bridge.force_send("T:1\n")
        elif action == "tilt_up":
            self.bridge.force_send("M:U\n")
        elif action == "tilt_down":
            self.bridge.force_send("M:D\n")
        elif action == "pan_left":
            self.bridge.force_send("M:L\n")
        elif action == "pan_right":
            self.bridge.force_send("M:R\n")
        elif action == "temp_up":
            self.settings = replace(self.settings, fire_temp_min=min(500, self.settings.fire_temp_min + 10))
        elif action == "temp_down":
            self.settings = replace(self.settings, fire_temp_min=max(50, self.settings.fire_temp_min - 10))
        elif action == "feeder_on":
            self.state.feeder_on = True
            self.bridge.force_send("FD:1\n")
        elif action == "feeder_off":
            self.state.feeder_on = False
            self.bridge.force_send("FD:0\n")
        return self._current_state_dict()

    def _handle_key_input(self) -> bool:
        key = (cv2.waitKey(1) & 0xFF) if self.settings.enable_local_display else 255

        if key == ord("q"):
            self.bridge.force_send("A:0\n")
            self.bridge.force_send("T:0\n")
            return True
        if key == ord("d"):
            self.state.emergency_stop = True
            self.state.is_armed = False
            self.state.auto_shoot = False
            self.bridge.force_send("A:0\n")
            self.bridge.force_send("T:0\n")
            print(">> EMERGENCY STOP!")
        elif key == ord("a"):
            self.state.emergency_stop = False
            self.state.auto_track = True
            self.state.auto_shoot = True
            self.bridge.force_send("T:1\n")
            print(">> RESUME: tracking + auto-shoot re-enabled")
        elif key == ord("s"):
            self.state.auto_shoot = True
            self.state.emergency_stop = False
            print(">> AUTO-SHOOT ON")
        elif key == ord("x"):
            self.state.auto_shoot = False
            print(">> AUTO-SHOOT OFF")
        elif key == ord("r"):
            self.state.auto_track = True
            self.bridge.force_send("T:1\n")
            print(">> TRACK ON")
        elif key == ord("f"):
            self.state.auto_track = False
            self.bridge.force_send("T:0\n")
            print(">> TRACK OFF")
        elif key == ord("t"):
            self.settings = replace(self.settings, fire_temp_min=min(500, self.settings.fire_temp_min + 10))
            print(f"Fire threshold: {self.settings.fire_temp_min}C")
        elif key == ord("g"):
            self.settings = replace(self.settings, fire_temp_min=max(50, self.settings.fire_temp_min - 10))
            print(f"Fire threshold: {self.settings.fire_temp_min}C")

        return False
