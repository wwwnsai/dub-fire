# GPIO Connections Reference

> Pin assignments and wiring for all hardware in the Dubfai fire suppression system.

---

## ESP32 DevKit (Main Controller)

### Digital Output — PWM / Servo

| GPIO | Label | Connected To | Signal Type | Notes |
|------|-------|-------------|-------------|-------|
| 32 | `SERVO_PAN_PIN` | Pan servo signal wire | PWM 50 Hz | Continuous rotation servo; 1100–1900 µs |
| 13 | `SERVO_TILT_PIN` | Tilt servo signal wire (MG945) | PWM 50 Hz | Positional; range 0°–180° (500–2500 µs) |
| 18 | `ESC1_PIN` | ESC 1 signal wire | PWM 50 Hz | Weapon actuator; 1100–1940 µs |
| 19 | `ESC2_PIN` | ESC 2 signal wire | PWM 50 Hz | Mirrors ESC 1 (both always driven together) |
| 27 | `FEEDER_PIN` | Feeder servo signal wire | PWM 50 Hz | Continuous rotation; FWD 1700 µs / REV 1300 µs / STOP 1500 µs |

### UART — Serial2 (IMU / ENV from Arduino Nano)

| GPIO | Role | Baud | Connected To |
|------|------|------|-------------|
| 16 | `IMU_RX_PIN` — RX2 | 115200 | Arduino Nano D1 (TX) |
| 17 | `IMU_TX_PIN` — TX2 | 115200 | Arduino Nano D0 (RX) — currently unused |

### UART — Serial1 (TOF Distance Sensor)

| GPIO | Role | Baud | Connected To |
|------|------|------|-------------|
| 25 | `TOF_RX_PIN` — RX1 | 921600 | TOF sensor TX |
| 26 | `TOF_TX_PIN` — TX1 | 921600 | TOF sensor RX |

### USB Serial (AI Service Bridge)

| Interface | Baud | Connected To |
|-----------|------|-------------|
| USB (UART0) | 115200 | PC via USB cable (COM9 / `/dev/ttyUSB0`) |

---

## Arduino Nano (Sensor Node)

The Nano acts as a dedicated sensor node, sending IMU and environment data to the ESP32 over serial.

### I2C Bus

| Pin | Label | Connected To | I2C Address | Notes |
|-----|-------|-------------|-------------|-------|
| A4  | SDA | MPU6050 SDA + SHTC3 SDA | — | Shared bus |
| A5  | SCL | MPU6050 SCL + SHTC3 SCL | — | Shared bus |

**Devices on I2C bus:**

| Device | Address | Function |
|--------|---------|---------|
| MPU6050 | `0x68` | 6-axis IMU (accelerometer + gyroscope) |
| SHTC3 | `0x70` | Temperature and humidity sensor |

### UART (to ESP32)

| Pin | Role | Baud | Connected To |
|-----|------|------|-------------|
| D1 (TX) | TX | 115200 | ESP32 GPIO 16 (RX2) |
| D0 (RX) | RX | 115200 | ESP32 GPIO 17 (TX2) — currently unused |

---

## Servo / ESC Pulse Reference

| Device | Min | Idle / Stop / Center | Max | Unit |
|--------|-----|---------------------|-----|------|
| Pan servo (continuous) | 1100 (full one direction) | 1500 (stopped) | 1900 (full other direction) | µs |
| Tilt servo MG945 (positional) | 0° | 90° | 100° | degrees |
| ESC 1 & 2 | 1100 (idle) | 1300 (locked/armed-idle) | 1940 (max power) | µs |
| Feeder servo | 1300 (reverse) | 1500 (stop) | 1700 (forward) | µs |

---

## Wiring Diagram (Text)

```
                    ESP32 DevKit
                 ┌──────────────────┐
    Pan Servo ───┤ GPIO 32          │
   Tilt Servo ───┤ GPIO 13          │
        ESC 1 ───┤ GPIO 18          │
        ESC 2 ───┤ GPIO 19          │
  Feeder Servo ───┤ GPIO 27         │
                 │                  │
  Arduino Nano   │                  │
     D1 (TX) ────┤ GPIO 16 (UART2 RX)│
     D0 (RX) ────┤ GPIO 17 (UART2 TX)│
                 │                  │
  TOF Sensor     │                  │
       TX ───────┤ GPIO 25 (Serial1 RX)│
       RX ───────┤ GPIO 26 (Serial1 TX)│
                 │                  │
      PC / AI ───┤ USB (UART0)      │
                 └──────────────────┘

              Arduino Nano
           ┌────────────────┐
MPU6050    │                │
  SDA ─────┤ A4             │
  SCL ─────┤ A5             │
           │                │
SHTC3      │ (same I2C bus) │
  SDA ─────┤ A4             │
  SCL ─────┤ A5             │
           │                │
ESP32      │                │
 GPIO 16 ──┤ D1 (TX)        │
 GPIO 17 ──┤ D0 (RX)        │
           └────────────────┘
```

---

## Power Notes

- Servos and ESCs should be powered from an external BEC/power rail — **not** from the ESP32 3.3 V or 5 V pins.
- Share a common GND between the ESP32, servos, ESCs, and the external power supply.
- Arduino Nano can be powered via its USB connector or the 5 V pin from the ESP32 VIN rail.
