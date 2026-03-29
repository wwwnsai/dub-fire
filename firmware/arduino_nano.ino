// code for entire system here #include <Wire.h>
#include <MPU6050.h>
#include "SHTC3.h"
#include <math.h>

MPU6050 mpu;
SHTC3 shtc3(Wire);

long gx_off = 0, gy_off = 0, gz_off = 0;
float pitch = 0.0;
float roll  = 0.0;
unsigned long lastTime = 0;
unsigned long lastEnvReadMs = 0;
#define ALPHA 0.98
#define ENV_INTERVAL_MS 2000

void setup() {
  Serial.begin(115200);  // D1 TX -> ESP32 GPIO 16 (RX2)
  Wire.begin();          // A4=SDA, A5=SCL
  delay(100);
  shtc3.begin(true);
  Serial.println("SHTC3 init done");

  mpu.initialize();

  if (mpu.testConnection()) {
    Serial.println("MPU6050 connected!");
  } else {
    Serial.println("Connection failed!");
  }

  Serial.println("Calibrating... keep still!");
  for (int i = 0; i < 1000; i++) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    gx_off += gx; gy_off += gy; gz_off += gz;
    delay(2);
  }
  gx_off /= 1000; gy_off /= 1000; gz_off /= 1000;
  mpu.setXGyroOffset(-gx_off / 4);
  mpu.setYGyroOffset(-gy_off / 4);
  mpu.setZGyroOffset(-gz_off / 4);
  Serial.println("Done!");

  lastTime = micros();
}

void loop() {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  float ax_g = ax / 16384.0;
  float ay_g = ay / 16384.0;
  float az_g = az / 16384.0;
  float gyroX = gx / 131.0;
  float gyroY = gy / 131.0;

  float accelPitch = atan2(ax_g, sqrt(ay_g * ay_g + az_g * az_g)) * 180.0 / PI;
  float accelRoll  = atan2(ay_g, sqrt(ax_g * ax_g + az_g * az_g)) * 180.0 / PI;

  unsigned long now = micros();
  float dt = (now - lastTime) / 1000000.0;
  lastTime = now;

  pitch = ALPHA * (pitch + gyroY * dt) + (1.0 - ALPHA) * accelPitch;
  roll  = ALPHA * (roll  + gyroX * dt) + (1.0 - ALPHA) * accelRoll;

  Serial.print("IMU:");
  Serial.print(pitch, 2);
  Serial.print(",");
  Serial.println(roll, 2);

  unsigned long nowMs = millis();
  if (nowMs - lastEnvReadMs >= ENV_INTERVAL_MS) {
    lastEnvReadMs = nowMs;

    shtc3.sample();
    float temperatureC = shtc3.readTempC();
    float humidity = shtc3.readHumidity();

    if (!isnan(temperatureC) && !isnan(humidity)) {
      Serial.print("ENV:");
      Serial.print(temperatureC, 2);
      Serial.print(",");
      Serial.println(humidity, 2);
    }
  }

  delay(10);
}
