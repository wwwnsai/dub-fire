// demo code for stepper motor

#include <Arduino.h>

// ----- X motor -----
#define X_STEP 27
#define X_DIR  26
#define JOY_X  34   // VRx

// ----- Y motor -----
#define Y_STEP 25
#define Y_DIR  33
#define JOY_Y  35   // VRy

// speed limits
const int MIN_HZ = 80;
const int MAX_HZ = 3200;
const int DEAD   = 400;

// ----- state per axis -----
struct Axis {
  unsigned long lastToggle = 0;
  unsigned long halfPeriodUS = 0;
  bool stepLevel = false;
  int adcMid = 2048;
};

Axis axX, axY;

void setFrequency(Axis &a, int hz, uint8_t stepPin){
  if (hz <= 0){
    a.halfPeriodUS = 0;
    a.stepLevel = false;
    digitalWrite(stepPin, LOW);
  } else {
    a.halfPeriodUS = (unsigned long)(500000UL / (unsigned long)hz);
  }
}

int calibrateCenter(uint8_t adcPin){
  long s=0; for(int i=0;i<64;i++){ s+=analogRead(adcPin); delay(3); }
  return s/64;
}

void handleAxis(uint8_t adcPin, Axis &a, uint8_t dirPin, uint8_t stepPin){
  int raw   = analogRead(adcPin);
  int delta = raw - a.adcMid;

  if (abs(delta) < DEAD){
    setFrequency(a, 0, stepPin);
  } else {
    digitalWrite(dirPin, (delta > 0) ? HIGH : LOW);
    int mag = abs(delta) - DEAD;
    int hz  = map(mag, 0, 2047, MIN_HZ, MAX_HZ);
    hz = constrain(hz, MIN_HZ, MAX_HZ);
    setFrequency(a, hz, stepPin);
  }
}

void stepGen(Axis &a, uint8_t stepPin){
  if (a.halfPeriodUS == 0) return;
  unsigned long now = micros();
  if (now - a.lastToggle >= a.halfPeriodUS){
    a.stepLevel = !a.stepLevel;
    digitalWrite(stepPin, a.stepLevel ? HIGH : LOW);
    a.lastToggle = now;
  }
}

void setup(){
  pinMode(X_STEP, OUTPUT); pinMode(X_DIR, OUTPUT);
  pinMode(Y_STEP, OUTPUT); pinMode(Y_DIR, OUTPUT);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Serial.begin(115200); delay(200);
  axX.adcMid = calibrateCenter(JOY_X);
  axY.adcMid = calibrateCenter(JOY_Y);

  Serial.print("adcMid X="); Serial.print(axX.adcMid);
  Serial.print("  Y="); Serial.println(axY.adcMid);
}

void loop(){
  handleAxis(JOY_X, axX, X_DIR, X_STEP);
  handleAxis(JOY_Y, axY, Y_DIR, Y_STEP);

  stepGen(axX, X_STEP);
  stepGen(axY, Y_STEP);

  delay(1);
}