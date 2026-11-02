// Botão no pino 2 (INPUT_PULLUP, ativo em LOW) controla o LED no pino 13.
const int BUTTON = 2;
const int LED = 13;
bool lastPressed = false;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
  Serial.println("Pronto");
}

void loop() {
  bool pressed = digitalRead(BUTTON) == LOW;
  digitalWrite(LED, pressed ? HIGH : LOW);
  if (pressed != lastPressed) {
    Serial.println(pressed ? "pressionado" : "solto");
    lastPressed = pressed;
  }
  delay(10);
}