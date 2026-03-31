#include <ESP32Servo.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

Servo panServo;
Servo tiltServo;
Servo esc1;
Servo esc2;

#define SERVO_PAN_PIN   32
#define SERVO_TILT_PIN  13
#define JOYSTICK_X      35
#define JOYSTICK_Y      34
#define SW_PIN          15
#define ESC1_PIN        18
#define ESC2_PIN        19
#define IMU_RX_PIN      16
#define IMU_TX_PIN      17
#define TOF_RX_PIN      25
#define TOF_TX_PIN      26

#define PAN_DEADZONE    200
#define PAN_STOP_US     1500
#define SPEED_MIN       50
#define SPEED_MAX       400

#define TILT_DEADZONE    200
#define TILT_MIN         45
#define TILT_MAX         135
#define TILT_SPEED_SLOW  30.0
#define TILT_SPEED_FAST  100.0
#define TILT_RAMP_ZONE   400

#define MIN_US           1100
#define LOCK_US          1300
#define MAX_US           1940

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
volatile bool  armed         = false;
volatile bool  autoTrack     = false;
volatile bool  shootCmd      = false;
volatile bool  stabEnabled   = true;

// --- Core 1 state ---
int JOY_PAN_CENTER  = 1840;
int JOY_TILT_CENTER = 1920;
float tiltAngle     = 90.0;
unsigned long lastTiltTime = 0;
int lastWrittenTilt = -1;

float pitchBaseline = 0.0;
bool  baselineSet   = false;

bool  lastBtn       = HIGH;
unsigned long lastClickTime = 0;
int   clickCount    = 0;
#define DCLICK_WINDOW 400

#define TRACK_PAN_GAIN   300.0
#define TRACK_TILT_GAIN  40.0
#define TRACK_DEADZONE   0.03

// --- Core 0 buffers ---
uint8_t tofBuf[TOF_FRAME_LEN];
int     tofBufIdx = 0;
char    imuBuf[64];
int     imuBufIdx = 0;
char    pcBuf[64];
int     pcBufIdx = 0;

// --- Helpers ---

int stableRead(int pin) {
  int readings[5], count = 0;
  for (int i = 0; i < 5; i++) {
    int v = analogRead(pin);
    if (v < 4000) readings[count++] = v;
  }
  if (count == 0) return 1920;
  for (int i = 0; i < count - 1; i++)
    for (int j = i + 1; j < count; j++)
      if (readings[j] < readings[i]) { int t = readings[i]; readings[i] = readings[j]; readings[j] = t; }
  return readings[count / 2];
}

void writeBoth(int us) {
  esc1.writeMicroseconds(us);
  esc2.writeMicroseconds(us);
}

// ============================================================
// CORE 0 - Serial I/O (all parsing happens here)
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
    } else {
      char buf[32];
      strncpy(buf, line + 2, sizeof(buf) - 1);
      buf[sizeof(buf) - 1] = '\0';
      char* comma = strchr(buf, ',');
      if (comma) {
        *comma = '\0';
        fireNormX = atof(buf);
        fireNormY = atof(comma + 1);
        fireDetected = true;
      }
    }
  } else if (strncmp(line, "A:", 2) == 0) {
    // Direct set - no intermediary flag
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
      Serial.println(">>> SHOOTING <<<");
      writeBoth(MAX_US);
      delay(1000);
      writeBoth(LOCK_US);
      Serial.println(">>> SHOT COMPLETE <<<");
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

  long sumX = 0;
  for (int i = 0; i < 50; i++) { sumX += stableRead(JOYSTICK_X); delay(20); }
  int calX = sumX / 50;
  if (calX > 500 && calX < 3500) JOY_PAN_CENTER = calX;
  Serial.print("PAN center: "); Serial.println(JOY_PAN_CENTER);

  long sumY = 0;
  for (int i = 0; i < 50; i++) { sumY += stableRead(JOYSTICK_Y); delay(20); }
  int calY = sumY / 50;
  if (calY > 500 && calY < 3500) JOY_TILT_CENTER = calY;
  Serial.print("TILT center: "); Serial.println(JOY_TILT_CENTER);

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  panServo.setPeriodHertz(50);
  panServo.attach(SERVO_PAN_PIN, 500, 2500);
  panServo.writeMicroseconds(PAN_STOP_US);

  tiltServo.setPeriodHertz(50);
  tiltServo.attach(SERVO_TILT_PIN, 500, 2500);
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

  int joyX  = stableRead(JOYSTICK_X);
  int joyY  = stableRead(JOYSTICK_Y);
  int centX = joyX - JOY_PAN_CENTER;
  int centY = joyY - JOY_TILT_CENTER;

  bool joystickActive = (abs(centX) > PAN_DEADZONE) || (abs(centY) > TILT_DEADZONE);

  if (joystickActive) {
    if (centX > PAN_DEADZONE) {
      int speed = map(centX, PAN_DEADZONE, 2048, SPEED_MIN, SPEED_MAX);
      speed = constrain(speed, SPEED_MIN, SPEED_MAX);
      panServo.writeMicroseconds(PAN_STOP_US - speed);
    } else if (centX < -PAN_DEADZONE) {
      int speed = map(abs(centX), PAN_DEADZONE, 2048, SPEED_MIN, SPEED_MAX);
      speed = constrain(speed, SPEED_MIN, SPEED_MAX);
      panServo.writeMicroseconds(PAN_STOP_US + speed);
    } else {
      panServo.writeMicroseconds(PAN_STOP_US);
    }

    if (centY < -TILT_DEADZONE) {
      int deflection = abs(centY) - TILT_DEADZONE;
      float t = constrain((float)deflection / TILT_RAMP_ZONE, 0.0, 1.0);
      float speed = TILT_SPEED_SLOW + t * t * (TILT_SPEED_FAST - TILT_SPEED_SLOW);
      tiltAngle += speed * dt;
      tiltAngle = constrain(tiltAngle, TILT_MIN, TILT_MAX);
    } else if (centY > TILT_DEADZONE) {
      int deflection = centY - TILT_DEADZONE;
      float t = constrain((float)deflection / TILT_RAMP_ZONE, 0.0, 1.0);
      float speed = TILT_SPEED_SLOW + t * t * (TILT_SPEED_FAST - TILT_SPEED_SLOW);
      tiltAngle -= speed * dt;
      tiltAngle = constrain(tiltAngle, TILT_MIN, TILT_MAX);
    }

  } else if (autoTrack && fireDetected) {
    if (abs(fireNormX) > TRACK_DEADZONE) {
      int trackSpeed = (int)(abs(fireNormX) * TRACK_PAN_GAIN);
      trackSpeed = constrain(trackSpeed, SPEED_MIN, SPEED_MAX);
      if (fireNormX > 0) {
        panServo.writeMicroseconds(PAN_STOP_US + trackSpeed);
      } else {
        panServo.writeMicroseconds(PAN_STOP_US - trackSpeed);
      }
    } else {
      panServo.writeMicroseconds(PAN_STOP_US);
    }

    if (abs(fireNormY) > TRACK_DEADZONE) {
      tiltAngle += fireNormY * TRACK_TILT_GAIN * dt;
      tiltAngle = constrain(tiltAngle, TILT_MIN, TILT_MAX);
    }

  } else {
    panServo.writeMicroseconds(PAN_STOP_US);
  }

  // Stabilization only when active
  float finalAngle;
  if (joystickActive || (autoTrack && fireDetected)) {
    finalAngle = getStabilizedAngle(tiltAngle);
  } else {
    finalAngle = tiltAngle;
  }

  int writeAngle = (int)finalAngle;
  if (writeAngle != lastWrittenTilt) {
    tiltServo.write(writeAngle);
    lastWrittenTilt = writeAngle;
  }

  // ESC idle state
  if (!shootCmd) {
    writeBoth(armed ? LOCK_US : MIN_US);
  }

  // Debug - slower rate to reduce serial congestion
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 500) {
    lastPrint = millis();
    Serial.print("X:"); Serial.print(centX);
    Serial.print(" Y:"); Serial.print(centY);
    Serial.print(" tilt:"); Serial.print(tiltAngle, 1);
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
