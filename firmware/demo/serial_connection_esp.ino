// for esp32
#include <HardwareSerial.h>
HardwareSerial Link(2);

void setup() {
  Serial.begin(115200);
  Link.begin(115200, SERIAL_8N1, 16, 17); // RX=16, TX=17
  Serial.println("\nHost ready, probing CAM every second...");
}

void loop() {
  // Pump CAM -> PC
  while (Link.available()) {
    int b = Link.read();
    if (isPrintable(b) || b=='\r' || b=='\n') Serial.write(b);
    else Serial.print('.'); // visualize non-printables
  }

  // Send a framed, human-readable probe once per second
  static uint32_t t=0;
  if (millis()-t > 1000) {
    t = millis();
    Link.println("[PING]");
  }

  // Also forward what you type in Serial Monitor
  while (Serial.available()) Link.write(Serial.read());
}




