// Potenciômetro no A0: imprime a leitura do ADC (0-1023) a cada 100 ms.
void setup() {
  Serial.begin(9600);
}

void loop() {
  Serial.print("A0=");
  Serial.println(analogRead(A0));
  delay(100);
}