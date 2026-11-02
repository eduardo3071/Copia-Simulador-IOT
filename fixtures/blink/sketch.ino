// Blink: LED externo no pino 13 (o mesmo do LED da placa).
const int LED = 13;

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
  Serial.println("Blink iniciado");
}

void loop() {
  digitalWrite(LED, HIGH);
  Serial.println("LED ligado");
  delay(500);
  digitalWrite(LED, LOW);
  Serial.println("LED desligado");
  delay(500);
}