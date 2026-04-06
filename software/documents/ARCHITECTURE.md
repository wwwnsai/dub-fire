# Dubfai — System Architecture

> Autonomous dual-sensor fire detection and suppression system with live streaming, remote control, and multi-channel alerting.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Web Application](#3-web-application)
4. [AI / Detection Service](#4-ai--detection-service)
5. [Firmware](#5-firmware)
6. [Hardware](#6-hardware)
7. [Database](#7-database)
8. [Notification Systems](#8-notification-systems)
9. [Data Flows](#9-data-flows)
10. [API Reference](#10-api-reference)
11. [Deployment](#11-deployment)
12. [Key Design Patterns](#12-key-design-patterns)
13. [Configuration Reference](#13-configuration-reference)

---

## 1. System Overview

Dubfai is a smart fire detection and automated suppression system built around three layers:

| Layer | Technology | Role |
|---|---|---|
| **Web App** | Next.js 15, React, Supabase | Dashboard, live camera, map, alerts |
| **AI Service** | Python, YOLOv8, OpenCV | Fire detection, stream server, ESP32 bridge |
| **Firmware** | ESP32 + Arduino Nano | Servo control, sensors, actuation |

The system detects fire using **sensor fusion** — both an RGB camera (YOLO model) and a thermal camera must independently confirm fire before the system arms and can engage. Once a target is confirmed for 2 seconds, the auto-shoot sequence fires and then enters a cooldown period. The fire location is then broadcast to the web dashboard, sending notifications via email, LINE, and web push.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER / OPERATOR                            │
│                   Browser (PWA, mobile/desktop)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WEB APP  (Next.js :3000)                       │
│                                                                     │
│  Pages: Home · Live Cam · Map · Settings · Profile                  │
│  API Routes: /fire-status · /fire-alert · /sensor-status            │
│              /subscribe · /push-noti · /line-noti                   │
│  State: fireStatusContext (EventBus) → Email/LINE/Push listeners    │
│  DB: Supabase (profiles, subscriptions)                             │
└────────────┬──────────────────────────────────┬────────────────────┘
             │ HTTP (fetch)                      │ Supabase client
             ▼                                  ▼
┌────────────────────────┐          ┌──────────────────────┐
│  AI SERVICE  (:5001)   │          │  Supabase (cloud)    │
│                        │          │  PostgreSQL + Auth    │
│  /rgb_feed    MJPEG    │          └──────────────────────┘
│  /thermal_feed MJPEG   │
│  /sensor      JSON     │
│  /control     POST     │
│                        │
│  YOLO v8 (best.pt)     │
│  Thermal fusion        │
│  State machine         │
└────────┬───────────────┘
         │ USB Serial (COM9 / /dev/ttyUSB0)
         ▼
┌─────────────────────────┐
│  ESP32 (main controller)│
│  Pan / Tilt servos      │
│  ESC (weapon)           │
│  IMU stabilisation      │
│  Joystick / Button      │
└────────┬────────────────┘
         │ UART (GPIO 16/17)
         ▼
┌─────────────────────────┐
│  Arduino Nano           │
│  MPU6050 IMU            │
│  SHTC3 Temp/Humidity    │
└─────────────────────────┘
```

---

## 3. Web Application

**Location:** `dub-fire/software/`
**Framework:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
**Runtime:** Node.js 20

### 3.1 Directory Structure

```
src/
├── app/
│   ├── (auth)/           # login, signup, callback (Supabase Auth)
│   ├── home/             # Dashboard — sensor status, fire alert test
│   ├── camera/           # Live feed + controls + pan/tilt
│   ├── map/              # Leaflet fire location map
│   ├── profile/          # User profile
│   ├── settings/         # App settings
│   ├── email/            # Email notification opt-in
│   └── api/
│       ├── fire-status/  # GET/POST fire location JSON
│       ├── fire-alert/   # POST → trigger email/push/LINE
│       ├── sensor-status/# GET live sensor data from ESP32
│       ├── subscribe/    # POST web push subscription
│       ├── push-noti/    # POST send push notification
│       ├── line-noti/    # POST LINE message
│       └── line-group/   # LINE group management
├── components/
│   ├── Layout.tsx        # Shell: top bar, bottom nav, notifications
│   ├── BottomNav.tsx     # Tab navigation
│   ├── LiveCamera.tsx    # MJPEG stream viewer
│   ├── LocationMap.tsx   # Leaflet map
│   ├── SensorStatus.tsx  # IMU / temp / humidity display
│   ├── NotificationBadge.tsx
│   ├── FireAlertTest.tsx
│   └── EmailEventListenerProvider.tsx
└── lib/
    ├── fireStatusContext.tsx  # Global fire state + EventBus bridge
    ├── eventBus.ts            # Pub/sub event hub
    ├── emailService.ts        # SendGrid / Resend email
    ├── emailEventListener.ts  # Auto-email on fire events
    ├── lineNotiService.ts     # LINE Messaging API
    ├── pushNotiService.ts     # Web Push (VAPID)
    ├── supabaseClient.ts      # Supabase singleton
    ├── subscriptions.ts       # Push subscription management
    └── types/
        └── users.ts           # Profile type definitions
```

### 3.2 Pages

| Route | Purpose |
|---|---|
| `/home` | Live sensor card, fire alert test button, status overview |
| `/camera` | Live RGB + thermal feeds, full controls panel, fullscreen mode |
| `/map` | Leaflet map with fire location markers; real-time severity overlays |
| `/settings` | Notification preferences |
| `/profile` | Auth user info |
| `/(auth)/login` | Supabase email+password login |

### 3.3 State Management

State flows through two mechanisms:

**`fireStatusContext.tsx`** — React Context
- Stores `fireLocations[]` (lat, lng, severity)
- On change, persists to `/api/fire-status` (JSON file in `/public`)
- Emits EventBus events on severity transitions

**`eventBus.ts`** — Singleton Pub/Sub
- Events:

| Event | Payload | Consumers |
|---|---|---|
| `fire:status-changed` | `{ locationId, fromStatus, toStatus, location }` | Layout (notifications), EmailEventListener |
| `fire:alert` | `{ status, location, severity, time }` | Layout |
| `fire:location-added` | location object | Map |
| `fire:location-updated` | location object | Map |
| `fire:location-removed` | locationId | Map |
| `fire:all-cleared` | — | Map, Layout |

### 3.4 Camera Page Controls

The `/camera` page communicates directly with the AI service at `NEXT_PUBLIC_AI_BASE_URL`:

- **Live feeds** — `<img src="/rgb_feed">` / `<img src="/thermal_feed">` (MJPEG)
- **Controls** — `POST /control` with `{ action }` string
- **Status polling** — `GET /sensor` every 1 second

**Available control actions:**

| Action | Effect |
|---|---|
| `arm` / `disarm` | Arm/disarm the weapon system |
| `track_on` / `track_off` | Enable/disable auto-tracking |
| `shoot_on` / `shoot_off` | Enable/disable auto-shoot |
| `shoot_now` | Fire immediately |
| `emergency_stop` / `resume` | Halt all motion / resume |
| `pan_left` / `pan_right` | Nudge pan servo |
| `tilt_up` / `tilt_down` | Nudge tilt servo |
| `temp_up` / `temp_down` | Adjust fire threshold ±10°C |

---

## 4. AI / Detection Service

**Location:** `dub-fire/AI/`
**Language:** Python 3.11
**Key libraries:** Ultralytics (YOLOv8), OpenCV, PySerial, NumPy

### 4.1 Module Overview

```
AI/
├── main.py          # Entry point — creates and runs FireDetectionApp
├── app.py           # Core application (state machine, fusion, streaming)
├── detection.py     # YOLO inference + thermal detection algorithms
├── serial_bridge.py # ESP32 serial communication
├── stream_server.py # HTTP server: feeds, sensor API, control API
├── config.py        # Environment-based configuration
└── models/
    ├── best.pt      # YOLOv8 fire model (6.2 MB, current)
    └── bestold.pt   # Previous model (18.4 MB)
```

### 4.2 Fire Detection Pipeline

```
RGB Camera (index 2)          Thermal Camera (index 1)
        │                               │
        ▼                               ▼
  detect_fire_rgb()            detect_fire_thermal()
  YOLO v8 inference            Y16 → Celsius conversion
  Returns: bbox, confidence    Median blur + morphology
        │                      Threshold > fire_temp_min
        │                      AND warm pixels > 40°C
        │                               │
        └──────────────┬────────────────┘
                       ▼
             _evaluate_fire_status()
             BOTH must detect → "confirmed"
                       │
                 ┌─────▼──────┐
                 │  armed?    │
                 └─────┬──────┘
                       │
              _update_arming_state()
              Auto-arm on dual detect
              Auto-disarm 5s after fire gone
                       │
              _handle_auto_shoot()
              2s confirmation timer
              Target must be in center region
              3s cooldown between shots
                       │
                       ▼
              serial_bridge.send("S:1")
              → ESP32 fires weapon
```

### 4.3 State Machine

The `FireDetectionApp` maintains these flags:

| Flag | Type | Description |
|---|---|---|
| `is_armed` | bool | Weapon system armed |
| `auto_track` | bool | Servos follow fire target |
| `auto_shoot` | bool | Auto-shoot when confirmed |
| `emergency_stop` | bool | Hard halt all motion/shoot |
| `fire_confirmed_duration` | float | Seconds both sensors have seen fire |
| `shot_count` | int | Total shots fired this session |
| `fire_temp_min` | float | Thermal threshold (°C) |

### 4.4 Detection Parameters

| Parameter | Default | Description |
|---|---|---|
| `FIRE_TEMP_MIN` | 100°C | Minimum thermal temperature to consider fire |
| `MIN_FIRE_AREA` | 5 px | Minimum contour area to count |
| `SHOOT_CONFIRM_TIME` | 2.0 s | Fire must be visible for this long before shooting |
| `SHOOT_COOLDOWN` | 3.0 s | Minimum time between shots |
| `DISARM_DELAY` | 5.0 s | Time after fire disappears before auto-disarm |
| `STREAM_FPS` | 30 | Target FPS for MJPEG streams |
| `JPEG_QUALITY` | 80 | JPEG compression quality |

### 4.5 HTTP Server Endpoints

**Base URL:** `http://127.0.0.1:5001`

| Method | Path | Description |
|---|---|---|
| `GET` | `/rgb_feed` | MJPEG stream — RGB camera with detection overlay |
| `GET` | `/thermal_feed` | MJPEG stream — Thermal colorized (iron palette) |
| `GET` | `/sensor` | JSON snapshot of all state and sensor readings |
| `POST` | `/control` | Send control command `{ "action": "..." }` |

**`GET /sensor` response:**
```json
{
  "isArmed": false,
  "autoTrack": true,
  "autoShoot": false,
  "emergencyStop": false,
  "shotCount": 2,
  "fireTempMin": 100.0,
  "fps": 9,
  "temperature_c": 25.7,
  "humidity": 37.3,
  "imu_pitch": 0.1,
  "imu_roll": -7.7,
  "updated_at": "2026-03-31T10:00:00Z",
  "source": "esp32"
}
```

### 4.6 Serial Protocol (AI → ESP32)

Messages sent from AI service to ESP32 over UART:

| Message | Meaning |
|---|---|
| `F:x,y\n` | Fire position (normalized -1.0 to 1.0) |
| `A:1\n` / `A:0\n` | Arm / Disarm |
| `T:1\n` / `T:0\n` | Track on / off |
| `S:1\n` | Shoot now |

Messages received from ESP32:

| Message | Meaning |
|---|---|
| `IMU:pitch,roll\n` | IMU angles in degrees |
| `ENV:temp,humidity\n` | Temperature (°C) and humidity (%) |

---

## 5. Firmware

### 5.1 ESP32 (Main Controller)

**Location:** `esp/` and `arduino/`
**Board:** ESP32 DevKit
**Framework:** Arduino (FreeRTOS dual-core)

#### Pin Assignments

| Pin | Function |
|---|---|
| GPIO 32 | Pan servo (continuous rotation) |
| GPIO 13 | Tilt servo MG945 (positional, 0°–180°) |
| GPIO 18 | ESC 1 |
| GPIO 19 | ESC 2 |
| GPIO 35 | Joystick X (analog) |
| GPIO 34 | Joystick Y (analog) |
| GPIO 15 | Button (arm/disarm + double-click stabilization) |
| GPIO 16 | UART2 RX (from Arduino Nano) |
| GPIO 17 | UART2 TX |
| GPIO 25 | TOF sensor RX |
| GPIO 26 | TOF sensor TX |

#### Servo Ranges

| Servo | Min | Center | Max |
|---|---|---|---|
| Pan (continuous) | 1100 µs (full left) | 1500 µs (stop) | 1900 µs (full right) |
| Tilt MG945 (positional) | 0° | 90° | 100° |
| ESC | 1100 µs (idle) | 1300 µs (locked) | 1940 µs (max power) |

#### Core Architecture (Dual-Core)

- **Core 0** — Serial I/O: reads from Arduino Nano (IMU/ENV), reads from PC (AI commands), sends sensor data upstream
- **Core 1** — Servo control loop: applies tracking commands, IMU stabilization, shoot signals, joystick manual override

#### State Variables

| Variable | Type | Set by |
|---|---|---|
| `is_armed` | bool | `A:1/0` from AI or button press |
| `auto_track` | bool | `T:1/0` from AI |
| `shoot_cmd` | bool | `S:1` from AI |
| `fire_x`, `fire_y` | float | `F:x,y` from AI |
| `imu_pitch`, `imu_roll` | float | Arduino Nano |

#### Stabilization

The tilt servo applies IMU compensation:
`tilt_angle = base_tilt - imu_pitch × gain`
This counteracts platform tilt so the camera/weapon stays level.

#### Shoot Sequence

1. `shoot_cmd` received
2. ESC ramps to `MAX_US` (1940 µs) for 1 second burst
3. Returns to idle (1100 µs)
4. `shot_count++`

### 5.2 Arduino Nano (Sensor Node)

**Location:** `arduino/arduino_nano.ino`
**Board:** Arduino Nano
**Sensors:** MPU6050 (I2C, addr 0x68) + SHTC3 (I2C, addr 0x70)

**Complementary filter:**
```
pitch = 0.98 × (pitch + gyro_x × dt) + 0.02 × accel_pitch
roll  = 0.98 × (roll  + gyro_y × dt) + 0.02 × accel_roll
```

**Output format (115200 baud to ESP32):**
```
IMU:pitch,roll
ENV:temp,humidity
```
Loop rate: ~50 Hz

---

## 6. Hardware

| Component | Model / Spec |
|---|---|
| Main controller | ESP32 DevKit v1 |
| Sensor node | Arduino Nano |
| IMU | MPU6050 (6-axis, I2C) |
| Temp/Humidity | SHTC3 (I2C) |
| RGB camera | USB webcam (index 2) |
| Thermal camera | USB thermal sensor, Y16 format (index 1) |
| Pan mechanism | Continuous rotation servo |
| Tilt mechanism | Standard positional servo |
| Weapon / suppressor | ESC-controlled actuator (dual ESC) |
| Distance sensor | TOF (time-of-flight) serial module |
| PC bridge | USB-Serial (COM9 / `/dev/ttyUSB0`) |

---

## 7. Database

### 7.1 Supabase (PostgreSQL)

**Profiles table** — created by `supabase-migration.sql`

```sql
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id),
  email         TEXT UNIQUE NOT NULL,
  username      TEXT,
  avatar_url    TEXT,
  email_noti    BOOLEAN DEFAULT FALSE,
  last_notified_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

Row-Level Security: users can only read/update their own row.

### 7.2 Fire Status (JSON File)

Persisted at `public/fire-status.json` — served statically, updated via API route.

```json
[
  {
    "lat": 13.729418,
    "lng": 100.775325,
    "name": "Fire Detected",
    "severity": "high"
  }
]
```

`severity` values: `"non-fire"` | `"high"`

Default location: ECC building (13.7295°N, 100.7754°E)

---

## 8. Notification Systems

| Channel | Provider | Trigger |
|---|---|---|
| Email | SendGrid (primary), Resend (fallback) | Fire status change → `fire:status-changed` event |
| Web Push | VAPID / Web Push API | Manual or status change |
| LINE | LINE Messaging API | Fire alert or cleared |

### Email Flow

```
fire:status-changed event
    ↓
emailEventListener.ts picks up
    ↓
POST /api/fire-alert
    ↓
emailService.getActiveSubscriptions()  ← Supabase: email_noti = true
    ↓
For each subscriber:
  emailService.deliverEmail()
    ↓
  SendGrid API  (fallback: Resend API)
    ↓
  updateNotificationTracking()  ← sets last_notified_at
```

### Push Notification Flow

```
User visits app → ServiceWorker registers
    ↓
POST /api/subscribe  → subscription stored in Supabase
    ↓
Fire event → POST /api/push-noti
    ↓
web-push.sendNotification() to all stored subscriptions
    ↓
ServiceWorker receives push → shows OS notification
```

---

## 9. Data Flows

### 9.1 Fire Detected → Auto-Suppress

```
1. RGB cam frame  →  detect_fire_rgb()   → fire bbox + confidence
2. Thermal frame  →  detect_fire_thermal() → fire mask + centroid
3. Both positive  →  fire confirmed
4. fire_confirmed_duration >= SHOOT_CONFIRM_TIME (2s)
5. is_armed = True (auto)
6. auto_shoot = True  →  serial_bridge.send("S:1")
7. ESP32 fires ESC burst (1s)
8. shot_count++, cooldown timer starts (3s)
9. Fire gone for DISARM_DELAY (5s) → is_armed = False
```

### 9.2 Fire Alert → Web Dashboard

```
1. AI detects fire (above)
2. Web app polls POST /api/fire-status  (or manual trigger)
3. fireStatusContext updates severity → "high"
4. eventBus.emit("fire:status-changed")
5. Layout.tsx → adds notification badge entry
6. LocationMap.tsx → renders red marker
7. EmailEventListener → sends emails
8. pushNotiService → sends web push
9. LINE notification sent
```

### 9.3 Operator Control → Servo Movement

```
Browser: click "Pan Left"
    ↓
POST http://AI_BASE_URL/control  { action: "pan_left" }
    ↓
stream_server.py → app.handle_command("pan_left")
    ↓
FireDetectionApp: sets pan nudge flag
    ↓
serial_bridge.force_send("PL\n")
    ↓
ESP32: parse command → servo pulse adjustment
    ↓
Servo moves
    ↓
ESP32 serial out: "IMU:0.1,-7.7\n"
    ↓
serial_bridge updates sensor snapshot
    ↓
Browser polls GET /sensor → displays updated pitch/roll
```

---

## 10. API Reference

### AI Service API (`http://localhost:5001`)

**`GET /sensor`**
```
200 OK
Content-Type: application/json

{ isArmed, autoTrack, autoShoot, emergencyStop, shotCount,
  fireTempMin, fps, temperature_c, humidity, imu_pitch, imu_roll,
  updated_at, source }
```

**`POST /control`**
```
Content-Type: application/json
Body: { "action": "<action_string>" }

200 OK → { "ok": true, "state": { ...sensor } }
400    → { "error": "Unknown action" }
```

**`GET /rgb_feed`**
**`GET /thermal_feed`**
```
Content-Type: multipart/x-mixed-replace; boundary=frame
Streams JPEG frames continuously (MJPEG)
```

### Web App API (`/api/...`)

**`GET /api/fire-status`**
```
200 OK → [ { lat, lng, name, severity }, ... ]
```

**`POST /api/fire-status`**
```
Body: [ { lat, lng, name, severity } ]
200 OK → { ok: true }
```

**`POST /api/fire-alert`**
```
Body: { status, location, severity, time }
200 OK → { sent: N }  (number of emails sent)
```

**`POST /api/subscribe`**
```
Body: PushSubscription object
200 OK → { ok: true }
```

---

## 11. Deployment

### 11.1 Docker Compose

```yaml
# docker-compose.yml
services:
  web:
    build: ./dub-fire/software
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_AI_BASE_URL: http://127.0.0.1:5001

  ai:
    build: ./dub-fire/AI
    ports: ["5001:5001"]
    depends_on: [web]
```

> **Windows note:** Docker Desktop cannot pass USB cameras or COM ports into containers. Run the AI service natively on the host and run only the web app in Docker.

### 11.2 Running Natively

**Web app:**
```bash
cd dub-fire/software
npm install
npm run dev        # development
npm run build && npm start  # production
```

**AI service:**
```bash
cd dub-fire/AI
pip install -r requirements.txt
python main.py
```

**Environment variables for AI service:**
```
RGB_CAM=2
THERMAL_CAM=1
ESP32_PORT=COM9
ESP32_BAUD=115200
STREAM_HOST=0.0.0.0
STREAM_PORT=5001
MODEL_PATH=./models/best.pt
FIRE_TEMP_MIN=100.0
SHOOT_CONFIRM_TIME=2.0
SHOOT_COOLDOWN=3.0
DISARM_DELAY=5.0
```

### 11.3 PWA / Service Worker

The web app is PWA-enabled (`@ducanh2912/next-pwa`). On HTTPS the browser will prompt to install. The service worker handles:
- Background push notifications
- Offline caching of static assets

---

## 12. Key Design Patterns

### Sensor Fusion (AND gate)
Both RGB (YOLO) AND thermal must detect fire. A single sensor false-positive cannot trigger suppression. This prevents accidental discharge from lighting glare or warm objects.

### Confirmation Timer
Even after fusion confirms fire, the system waits `SHOOT_CONFIRM_TIME` (2 s) before firing. The timer resets if fire detection drops. This filters momentary false positives.

### Auto-disarm Timeout
After fire is no longer detected by either sensor, the system stays armed for `DISARM_DELAY` (5 s) in case the fire is temporarily obscured by smoke. After the timeout it disarms automatically.

### Event-Driven Notifications
`fireStatusContext` does not call email/push services directly. It emits `fire:status-changed` on the EventBus. Email, push, and LINE listeners are independently subscribed. Adding a new notification channel only requires a new listener — no changes to the fire state logic.

### Rate-Limited Serial
The AI service throttles serial writes to ESP32 (50 ms interval). This prevents overflowing the ESP32 serial buffer when the tracking loop runs at 30 FPS.

### Thread Safety
- Python AI: `threading.Lock` around shared frame buffers
- ESP32: FreeRTOS tasks on separate cores with shared state guarded by critical sections

### Graceful Degradation
- No ESP32 connected → AI service runs with warnings, streams still work
- AI service unreachable → web app shows empty feed, controls disabled
- Supabase unreachable → fire status falls back to local JSON file

---

## 13. Configuration Reference

### Web App (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `NEXT_PUBLIC_AI_BASE_URL` | AI service base URL (default: `http://127.0.0.1:5001`) |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot channel token |
| `LINE_USER_ID` | LINE user/group to notify |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `SENDGRID_API_KEY` | SendGrid API key |
| `RESEND_API_KEY` | Resend API key (fallback) |

### AI Service (environment or `config.py`)

| Variable | Default | Description |
|---|---|---|
| `RGB_CAM` | `2` | RGB camera device index |
| `THERMAL_CAM` | `1` | Thermal camera device index |
| `ESP32_PORT` | `COM9` | Serial port for ESP32 |
| `ESP32_BAUD` | `115200` | Serial baud rate |
| `MODEL_PATH` | `./models/best.pt` | YOLOv8 model path |
| `FIRE_TEMP_MIN` | `100.0` | Thermal fire threshold (°C) |
| `MIN_FIRE_AREA` | `5` | Min contour area (pixels) |
| `SHOOT_CONFIRM_TIME` | `2.0` | Seconds before auto-shoot |
| `SHOOT_COOLDOWN` | `3.0` | Seconds between shots |
| `DISARM_DELAY` | `5.0` | Seconds before auto-disarm |
| `STREAM_FPS` | `30` | MJPEG target FPS |
| `JPEG_QUALITY` | `80` | MJPEG JPEG quality (0–100) |
| `STREAM_HOST` | `0.0.0.0` | HTTP server bind address |
| `STREAM_PORT` | `5001` | HTTP server port |
