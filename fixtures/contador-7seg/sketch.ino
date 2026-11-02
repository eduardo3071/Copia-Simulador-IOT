// Contador 0-9: display de 7 segmentos em D2-D8 (A-G) e barra de LEDs em D9-D13 e A0-A4.
const byte SEG[7] = {2, 3, 4, 5, 6, 7, 8};
const byte BAR[10] = {9, 10, 11, 12, 13, A0, A1, A2, A3, A4};
// bit 0 = segmento A ... bit 6 = segmento G
const byte DIGITS[10] = {0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F};

void setup() {
  Serial.begin(9600);
  for (byte p : SEG) pinMode(p, OUTPUT);
  for (byte p : BAR) pinMode(p, OUTPUT);
}

void loop() {
  for (int n = 0; n < 10; n++) {
    for (int s = 0; s < 7; s++) digitalWrite(SEG[s], (DIGITS[n] >> s) & 1);
    for (int i = 0; i < 10; i++) digitalWrite(BAR[i], i <= n ? HIGH : LOW);
    Serial.println(n);
    delay(500);
  }
}