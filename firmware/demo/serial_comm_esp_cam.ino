// for esp32-cam
void setup() {
  Serial.begin(115200);
  Serial.println("\nESP32-CAM echo ready @115200");
}
void loop() {
  while (Serial.available()) {
    int c = Serial.read();
    Serial.write(c);              // echo back
  }
}
