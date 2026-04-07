#include <ESP32Servo.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

Servo panServo;
Servo tiltServo;
Servo feederServo;
Servo esc1;
Servo esc2;

#define SERVO_PAN_PIN     32
#define SERVO_TILT_PIN    13
#define SERVO_FEEDER_PIN  27
#define FEEDER_HOME       130
#define FEEDER_LOAD       0
#define SW_PIN          15
#define ESC1_PIN        18
#define ESC2_PIN        19
#define IMU_RX_PIN      16
#define IMU_TX_PIN      17
#define TOF_RX_PIN      25
#define TOF_TX_PIN      26

#define PAN_STOP_US       1500
#define PAN_TRIM_US       0       // shift center if servo doesn't stop cleanly
#define PAN_RIGHT_SCALE   1.0     // boost right speed if right is weak (try 1.3)
#define PAN_LEFT_SCALE    1.0     // boost left speed if left is weak (try 1.3)
#define SPEED_MIN         50
#define SPEED_MAX         400

#define TILT_MIN         45
#define TILT_MAX         135
#define TILT_SPEED_SLOW  30.0
#define TILT_SPEED_FAST  100.0

#define MIN_US           1100
#define LOCK_US          1300
#define MAX_US           1400

#define STAB_GAIN        1.0
#define STAB_MAX_OFFSET  15.0
#define IMU_TIMEOUT_MS   500

#define TOF_FRAME_LEN   16
HardwareSerial tofSerial(1);

// --- Shared state (all volatile for cross-core) ---
volatile float imuPitch      = 0.0;
volatile float imuRoll       = 0.0;
volatile bool  imuValid      = false;
volatile unsigned long lastImuTime = 0;
volatile float envTempC      = 0.0;
volatile float envHumidity   = 0.0;
volatile bool  envValid      = false;

volatile int   tofDistance_mm = -1;

volatile float fireNormX     = 0.0;
volatile float fireNormY     = 0.0;
volatile bool  fireDetected  = false;
volatile bool  fireUpdated   = false;  // set when a new F: command arrives, cleared after processing
volatile bool  armed         = false;
volatile bool  autoTrack     = false;
volatile bool  shootCmd      = false;
volatile int   shootSpeedUs  = MAX_US;   // overridable via V: command
volatile bool  feederActive  = false;
volatile bool  stabEnabled   = true;

// --- Core 1 state ---
float tiltAngle     = 90.0;
unsigned long lastTiltTime = 0;
int lastWrittenTilt = -1;
unsigned long shootUntil = 0;
#define SHOOT_DURATION_MS  3000

float pitchBaseline = 0.0;
bool  baselineSet   = false;

bool  lastBtn       = HIGH;
unsigned long lastClickTime = 0;
int   clickCount    = 0;
#define DCLICK_WINDOW 400

#define TRACK_PAN_GAIN      300.0
#define TRACK_TILT_GAIN     20.0
#define TRACK_DEADZONE      0.02
#define TILT_MAX_DEG_PER_S  25.0   // max tilt speed in degrees/second

// --- Core 0 buffers ---
uint8_t tofBuf[TOF_FRAME_LEN];
int     tofBufIdx = 0;
char    imuBuf[64];
int     imuBufIdx = 0;
char    pcBuf[64];
int     pcBufIdx = 0;

// --- Helpers ---

void writeBoth(int us) {
  esc1.writeMicroseconds(us);
  esc2.writeMicroseconds(us);
}

// ============================================================
// CORE 0 - Serial I/O
// ============================================================

void parseTofFrame(uint8_t* buf) {
  uint8_t sum = 0;
  for (int i = 0; i < TOF_FRAME_LEN - 1; i++) sum += buf[i];
  if (sum != buf[TOF_FRAME_LEN - 1]) return;
  uint32_t dis_raw = (uint32_t)buf[8] | ((uint32_t)buf[9] << 8) | ((uint32_t)buf[10] << 16);
  if (dis_raw & 0x800000) {
    tofDistance_mm = -1;
  } else {
    tofDistance_mm = (int)dis_raw;
  }
}

void readTof() {
  while (tofSerial.available()) {
    uint8_t b = tofSerial.read();
    if (tofBufIdx == 0 && b != 0x57) continue;
    if (tofBufIdx == 1 && b != 0x00) { tofBufIdx = 0; continue; }
    tofBuf[tofBufIdx++] = b;
    if (tofBufIdx >= TOF_FRAME_LEN) {
      parseTofFrame(tofBuf);
      tofBufIdx = 0;
    }
  }
}

void parseImuLine(const char* line) {
  bool isImu = strncmp(line, "IMU:", 4) == 0;
  bool isEnv = strncmp(line, "ENV:", 4) == 0;
  if (!isImu && !isEnv) return;

  char buf[64];
  strncpy(buf, line + 4, sizeof(buf) - 1);
  buf[sizeof(buf) - 1] = '\0';
  char* tok1 = strtok(buf, ",");
  char* tok2 = strtok(NULL, ",");
  if (tok1 && tok2) {
    if (isImu) {
      imuPitch    = atof(tok1);
      imuRoll     = atof(tok2);
      lastImuTime = millis();
      imuValid    = true;
    } else {
      envTempC    = atof(tok1);
      envHumidity = atof(tok2);
      envValid    = true;
    }
  }
}

void readImu() {
  while (Serial2.available()) {
    char c = Serial2.read();
    if (c == '\n' || c == '\r') {
      if (imuBufIdx > 0) {
        imuBuf[imuBufIdx] = '\0';
        parseImuLine(imuBuf);
        imuBufIdx = 0;
      }
    } else if (imuBufIdx < (int)sizeof(imuBuf) - 1) {
      imuBuf[imuBufIdx++] = c;
    } else {
      imuBufIdx = 0;
    }
  }
  if (imuValid && (millis() - lastImuTime > IMU_TIMEOUT_MS)) {
    imuValid    = false;
    baselineSet = false;
  }
}

void parsePcLine(const char* line) {
  if (strncmp(line, "F:", 2) == 0) {
    if (strncmp(line + 2, "NONE", 4) == 0) {
      fireDetected = false;
      fireUpdated  = false;
      fireNormX    = 0.0;
      fireNormY    = 0.0;
    } else {
      char buf[32];
      strncpy(buf, line + 2, sizeof(buf) - 1);
      buf[sizeof(buf) - 1] = '\0';
      char* comma = strchr(buf, ',');
      if (comma) {
        *comma = '\0';
        fireNormX    = atof(buf);
        fireNormY    = atof(comma + 1);
        fireDetected = true;
        fireUpdated  = true;
      }
    }
  } else if (strncmp(line, "A:", 2) == 0) {
    armed = (line[2] == '1');
    if (!armed) writeBoth(MIN_US);
    Serial.println(armed ? "PC: ARMED" : "PC: DISARMED");
  } else if (strncmp(line, "T:", 2) == 0) {
    autoTrack = (line[2] == '1');
    Serial.println(autoTrack ? "PC: TRACK ON" : "PC: TRACK OFF");
  } else if (strncmp(line, "S:", 2) == 0) {
    if (line[2] == '1') {
      shootCmd = true;
      Serial.println("PC: SHOOT CMD RECEIVED");
    }
  } else if (strncmp(line, "V:", 2) == 0) {
    int us = atoi(line + 2);
    shootSpeedUs = constrain(us, LOCK_US, MAX_US);
    Serial.print("PC: SHOOT SPEED "); Serial.print(shootSpeedUs); Serial.println("us");
  } else if (strncmp(line, "FD:", 3) == 0) {
    feederActive = (line[3] == '1');
    feederServo.write(feederActive ? FEEDER_LOAD : FEEDER_HOME);
    Serial.println(feederActive ? "PC: FEEDER ON" : "PC: FEEDER OFF");
  }
}

void readPC() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (pcBufIdx > 0) {
        pcBuf[pcBufIdx] = '\0';
        parsePcLine(pcBuf);
        pcBufIdx = 0;
      }
    } else if (pcBufIdx < (int)sizeof(pcBuf) - 1) {
      pcBuf[pcBufIdx++] = c;
    } else {
      pcBufIdx = 0;
    }
  }
}

void serialTask(void* param) {
  for (;;) {
    readImu();
    readTof();
    readPC();
    vTaskDelay(1);
  }
}

// ============================================================
// CORE 1 - Servo control
// ============================================================

float getStabilizedAngle(float target) {
  if (!stabEnabled || !imuValid) return target;
  if (!baselineSet) {
    pitchBaseline = imuPitch;
    baselineSet = true;
    Serial.print("IMU baseline: "); Serial.println(pitchBaseline, 2);
  }
  float correctedPitch = imuPitch - pitchBaseline;
  float offset = -correctedPitch * STAB_GAIN;
  offset = constrain(offset, -STAB_MAX_OFFSET, STAB_MAX_OFFSET);
  return constrain(target + offset, TILT_MIN, TILT_MAX);
}

void handleButton() {
  bool btn = digitalRead(SW_PIN);
  if (lastBtn == HIGH && btn == LOW) {
    unsigned long now = millis();
    if (now - lastClickTime < DCLICK_WINDOW) {
      clickCount++;
    } else {
      clickCount = 1;
    }
    lastClickTime = now;
  }
  lastBtn = btn;

  if (clickCount > 0 && (millis() - lastClickTime > DCLICK_WINDOW)) {
    if (clickCount == 1) {
      armed = !armed;
      if (!armed) writeBoth(MIN_US);
      Serial.println(armed ? "BTN: ARMED" : "BTN: DISARMED");
    } else if (clickCount >= 2) {
      stabEnabled = !stabEnabled;
      baselineSet = false;
      Serial.println(stabEnabled ? "BTN: STAB ON" : "BTN: STAB OFF");
    }
    clickCount = 0;
  }
}

void handleShoot() {
  if (shootCmd) {
    shootCmd = false;
    if (armed) {
      shootUntil = millis() + SHOOT_DURATION_MS;
      Serial.println(">>> SHOOT: motors spinning up <<<");
    } else {
      Serial.println(">>> SHOOT DENIED: NOT ARMED <<<");
    }
  }
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, IMU_RX_PIN, IMU_TX_PIN);
  tofSerial.begin(921600, SERIAL_8N1, TOF_RX_PIN, TOF_TX_PIN);
  delay(1000);
  while (Serial2.available()) Serial2.read();

  pinMode(SW_PIN, INPUT_PULLUP);

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  panServo.setPeriodHertz(50);
  panServo.attach(SERVO_PAN_PIN, 500, 2500);
  panServo.writeMicroseconds(PAN_STOP_US);

  tiltServo.setPeriodHertz(50);
  tiltServo.attach(SERVO_TILT_PIN, 500, 2500);

  feederServo.setPeriodHertz(50);
  feederServo.attach(SERVO_FEEDER_PIN, 500, 2500);
  feederServo.write(FEEDER_HOME);
  delay(100);
  Serial.println("Tilt centering...");
  for (int i = 0; i < 20; i++) {
    tiltServo.write(90);
    delay(50);
  }
  lastWrittenTilt = 90;
  Serial.println("Tilt ready at 90");

  esc1.setPeriodHertz(50);
  esc2.setPeriodHertz(50);
  esc1.attach(ESC1_PIN, MIN_US, MAX_US);
  esc2.attach(ESC2_PIN, MIN_US, MAX_US);
  writeBoth(MIN_US);

  lastTiltTime = micros();

  xTaskCreatePinnedToCore(serialTask, "SerialIO", 4096, NULL, 1, NULL, 0);

  Serial.println("Ready. Dual-core active.");
}

void loop() {
  handleButton();
  handleShoot();

  unsigned long now = micros();
  float dt = (now - lastTiltTime) / 1000000.0;
  lastTiltTime = now;
  if (dt > 0.05) dt = 0.05;

  if (autoTrack && fireDetected) {
    if (abs(fireNormX) > TRACK_DEADZONE) {
      float scale = (fireNormX > 0) ? PAN_RIGHT_SCALE : PAN_LEFT_SCALE;
      int trackSpeed = (int)(abs(fireNormX) * TRACK_PAN_GAIN * scale);
      trackSpeed = constrain(trackSpeed, SPEED_MIN, SPEED_MAX);
      panServo.writeMicroseconds(fireNormX > 0 ? PAN_STOP_US + PAN_TRIM_US + trackSpeed : PAN_STOP_US + PAN_TRIM_US - trackSpeed);
    } else {
      panServo.writeMicroseconds(PAN_STOP_US + PAN_TRIM_US);
    }

    if (abs(fireNormY) > TRACK_DEADZONE) {
      float tiltDelta = fireNormY * TRACK_TILT_GAIN * dt;
      float maxDelta  = TILT_MAX_DEG_PER_S * dt;
      tiltDelta = constrain(tiltDelta, -maxDelta, maxDelta);
      tiltAngle += tiltDelta;
      tiltAngle = constrain(tiltAngle, TILT_MIN, TILT_MAX);
    }
  } else {
    panServo.writeMicroseconds(PAN_STOP_US + PAN_TRIM_US);
  }

  // Apply stabilization whenever autoTrack is on to avoid snap when fire briefly drops out
  float finalAngle = autoTrack ? getStabilizedAngle(tiltAngle) : tiltAngle;

  int writeAngle = (int)finalAngle;
  if (writeAngle != lastWrittenTilt) {
    tiltServo.write(writeAngle);
    lastWrittenTilt = writeAngle;
  }

  if (millis() < shootUntil) {
    writeBoth(shootSpeedUs);
  } else {
    writeBoth(armed ? LOCK_US : MIN_US);
  }

  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 500) {
    lastPrint = millis();
    Serial.print("tilt:"); Serial.print(tiltAngle, 1);
    Serial.print("->"); Serial.print(finalAngle, 1);
    if (imuValid) {
      Serial.print(" P:"); Serial.print(imuPitch - pitchBaseline, 1);
      Serial.print(" R:"); Serial.print((float)imuRoll, 1);
    } else {
      Serial.print(" IMU:---");
    }
    Serial.print(" D:"); Serial.print((int)tofDistance_mm); Serial.print("mm");
    if (envValid) {
      Serial.print(" T:"); Serial.print((float)envTempC, 1); Serial.print("C");
      Serial.print(" H:"); Serial.print((float)envHumidity, 1); Serial.print("%");
    } else {
      Serial.print(" ENV:---");
    }
    Serial.print(" FIRE:"); Serial.print(fireDetected ? "YES" : "no");
    if (fireDetected) {
      Serial.print("("); Serial.print((float)fireNormX, 2);
      Serial.print(","); Serial.print((float)fireNormY, 2); Serial.print(")");
    }
    Serial.print(" TRK:"); Serial.print(autoTrack ? "ON" : "OFF");
    Serial.print(" S:"); Serial.print(stabEnabled ? "ON" : "OFF");
    Serial.print(" "); Serial.println(armed ? "ARMED" : "SAFE");
  }
}
