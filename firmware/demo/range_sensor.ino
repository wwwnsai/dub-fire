// demo code for range sensor

#include <Arduino.h>

// ESP32 UART2 <-> Waveshare TOF Laser Range Sensor (B)
// Default sensor UART baud: 921600, 8N1. Frame = 16 bytes, header 57 00 FF.

HardwareSerial TOF(2);
static const int TOF_RX_PIN = 16;  // sensor TX -> ESP32 RX
static const int TOF_TX_PIN = 17;  // sensor RX <- ESP32 TX
static const long TOF_BAUD   = 921600;

const uint8_t HDR[3]  = {0x57, 0x00, 0xFF};
const uint8_t FRAME   = 16;

uint8_t ring[128];
size_t  head = 0;

bool checksumOK(const uint8_t* d, uint8_t len){
  uint8_t s = 0; for (int i=0;i<len-1;i++) s += d[i];
  return s == d[len-1];
}

void parseFrame(const uint8_t *f){
  uint8_t  id   = f[3];
  uint32_t tms  = (uint32_t)f[4] | ((uint32_t)f[5]<<8) | ((uint32_t)f[6]<<16) | ((uint32_t)f[7]<<24);
  uint32_t dmm  = (uint32_t)f[8] | ((uint32_t)f[9]<<8) | ((uint32_t)f[10]<<16); // mm
  uint8_t  st   = f[11];
  uint16_t sig  = (uint16_t)f[12] | ((uint16_t)f[13]<<8);
  uint8_t  prec = f[14]; // cm

  Serial.print("id="); Serial.print(id);
  Serial.print("  t="); Serial.print(tms); Serial.print("ms");
  Serial.print("  dist="); Serial.print(dmm); Serial.print(" mm");
  Serial.print("  status="); Serial.print(st);
  Serial.print("  signal="); Serial.print(sig);
  Serial.print("  precision="); Serial.print(prec); Serial.println("cm");
}

void setup(){
  Serial.begin(115200);       // USB debug
  delay(200);
  Serial.println("TOF(B) @ 921600 starting...");

  TOF.begin(TOF_BAUD, SERIAL_8N1, TOF_RX_PIN, TOF_TX_PIN);
  TOF.setRxBufferSize(1024);  // high rate stream -> larger buffer
}

void loop(){
  while (TOF.available()){
    ring[head++ % sizeof(ring)] = TOF.read();

    size_t start = (head > 64 ? head - 64 : 0);
    for (size_t s = start; s + 3 <= head; s++){
      size_t i0 = s % sizeof(ring);
      size_t i1 = (s+1) % sizeof(ring);
      size_t i2 = (s+2) % sizeof(ring);
      if (ring[i0]==HDR[0] && ring[i1]==HDR[1] && ring[i2]==HDR[2]){
        if (head - s >= FRAME){
          uint8_t f[FRAME];
          for (int k=0;k<FRAME;k++) f[k] = ring[(s+k)%sizeof(ring)];
          if (checksumOK(f, FRAME)) parseFrame(f);
        }
        break;
      }
    }
  }
}