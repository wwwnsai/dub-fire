#include <ESP32Servo.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

#define ESC1_PIN        18
#define ESC2_PIN        19
#define TILT_PIN        13
#define FEEDER_PIN      27
#define FEEDER_HOME     130
#define FEEDER_LOAD     0
#define MIN_US          1100
#define MAX_US          1400
#define TILT_MIN        45
#define TILT_MAX        135
#define IMU_RX_PIN      16
#define IMU_TX_PIN      17

Servo esc1;
Servo esc2;
Servo tiltServo;
Servo feederServo;

int   currentTilt    = 90;
int   currentEscUs   = MIN_US;

// --- IMU state ---
float imuPitch  = 0.0;
float imuRoll   = 0.0;
bool  imuValid  = false;
char  imuBuf[64];
int   imuBufIdx = 0;

// --- Serial input ---
char inputBuf[16];
int  inputIdx = 0;

// -------------------------------------------------------

void writeBoth(int us) {
  us = constrain(us, MIN_US, MAX_US);
  currentEscUs = us;
  esc1.writeMicroseconds(us);
  esc2.writeMicroseconds(us);
  Serial.print("ESC: "); Serial.print(us); Serial.println(" us");
}

void setTilt(int deg) {
  deg = constrain(deg, TILT_MIN, TILT_MAX);
  currentTilt = deg;
  tiltServo.write(deg);
  Serial.print("Tilt: "); Serial.print(deg); Serial.println("°");
}

void setFeeder(bool load) {
  feederServo.write(load ? FEEDER_LOAD : FEEDER_HOME);
  Serial.println(load ? "Feeder: PUSH" : "Feeder: HOME");
}

void parseImuLine(const char* line) {
  if (strncmp(line, "IMU:", 4) != 0) return;
  char buf[32];
  strncpy(buf, line + 4, sizeof(buf) - 1);
  buf[sizeof(buf) - 1] = '\0';
  char* tok1 = strtok(buf, ",");
  char* tok2 = strtok(NULL, ",");
  if (tok1 && tok2) {
    imuPitch = atof(tok1);
    imuRoll  = atof(tok2);
    imuValid = true;
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
}

void printStatus() {
  Serial.print("Tilt: "); Serial.print(currentTilt); Serial.print("°");
  Serial.print("  ESC: "); Serial.print(currentEscUs); Serial.print(" us");
  if (imuValid) {
    Serial.print("  |  IMU pitch: "); Serial.print(imuPitch, 1);
    Serial.print("°  roll: "); Serial.print(imuRoll, 1); Serial.print("°");
  } else {
    Serial.print("  |  IMU: ---");
  }
  Serial.println();
}

// countdown then fire feeder, then home
void doShoot(int escUs) {
  writeBoth(escUs);
  delay(300);   // motors spinning

  Serial.println("--- SHOOT SEQUENCE ---");
  for (int i = 3; i >= 1; i--) {
    readImu();
    Serial.print(i); Serial.print("...  ");
    printStatus();
    delay(1000);
  }

  Serial.println("FIRE!");
  setFeeder(true);
  delay(1500);
  setFeeder(false);

  Serial.println("--- DONE --- measure distance now");
  printStatus();

  writeBoth(MIN_US);  // stop motors after shot
}

// -------------------------------------------------------

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, IMU_RX_PIN, IMU_TX_PIN);
  delay(500);
  while (Serial2.available()) Serial2.read();

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  tiltServo.setPeriodHertz(50);
  tiltServo.attach(TILT_PIN, 500, 2500);
  setTilt(90);

  feederServo.setPeriodHertz(50);
  feederServo.attach(FEEDER_PIN, 500, 2500);
  feederServo.write(FEEDER_HOME);
  delay(500);

  esc1.setPeriodHertz(50);
  esc2.setPeriodHertz(50);
  esc1.attach(ESC1_PIN, MIN_US, MAX_US);
  esc2.attach(ESC2_PIN, MIN_US, MAX_US);
  writeBoth(MIN_US);

  Serial.println("=== ESC + Tilt + Feeder + IMU Test ===");
  Serial.println();
  Serial.println("ESC:    min / max / arm / <1100-1400>");
  Serial.println("Tilt:   t<deg>  t+  t-        e.g. t90  t110");
  Serial.println("Feeder: fd1 (push)  fd0 (home)");
  Serial.println("Shoot:  shoot         — 3s countdown at current ESC speed");
  Serial.println("        shoot<us>     — set speed + 3s countdown  e.g. shoot1300");
  Serial.println("Info:   s             — print status");
  Serial.println();
  Serial.println("Quick calibration:");
  Serial.println("  arm → t90 → shoot1200  (loads, counts 3s, fires, stops)");
  Serial.println("  measure → shoot1300 → measure → shoot1400 → measure");
}

void loop() {
  readImu();

  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 2000) {
    lastPrint = millis();
    printStatus();
  }

  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputIdx > 0) {
        inputBuf[inputIdx] = '\0';
        inputIdx = 0;
        handleCommand(inputBuf);
      }
    } else if (inputIdx < (int)sizeof(inputBuf) - 1) {
      inputBuf[inputIdx++] = c;
    }
  }
}

void handleCommand(const char* cmd) {
  // --- Shoot with countdown ---
  if (strncmp(cmd, "shoot", 5) == 0) {
    int us = (strlen(cmd) > 5) ? atoi(cmd + 5) : currentEscUs;
    us = constrain(us, MIN_US, MAX_US);
    doShoot(us);
    return;
  }

  // --- Tilt ---
  if (cmd[0] == 't') {
    if (cmd[1] == '+') {
      setTilt(currentTilt + 5);
    } else if (cmd[1] == '-') {
      setTilt(currentTilt - 5);
    } else {
      int deg = atoi(cmd + 1);
      if (deg >= TILT_MIN && deg <= TILT_MAX) {
        setTilt(deg);
      } else {
        Serial.print("Tilt out of range ("); Serial.print(TILT_MIN);
        Serial.print("-"); Serial.print(TILT_MAX); Serial.println(")");
      }
    }
    delay(400);
    printStatus();
    return;
  }

  // --- Feeder manual ---
  if (strcmp(cmd, "fd1") == 0) { setFeeder(true);  return; }
  if (strcmp(cmd, "fd0") == 0) { setFeeder(false); return; }

  // --- Status ---
  if (strcmp(cmd, "s") == 0) { printStatus(); return; }

  // --- ESC ---
  if (strcmp(cmd, "min") == 0) {
    writeBoth(MIN_US);
  } else if (strcmp(cmd, "max") == 0) {
    writeBoth(MAX_US);
  } else if (strcmp(cmd, "arm") == 0) {
    Serial.println("Arming: 2 s at MIN_US...");
    writeBoth(MIN_US);
    delay(2000);
    Serial.println("Done.");
  } else {
    int val = atoi(cmd);
    if (val >= MIN_US && val <= MAX_US) {
      writeBoth(val);
      printStatus();
    } else {
      Serial.print("Unknown: "); Serial.println(cmd);
    }
  }
}
