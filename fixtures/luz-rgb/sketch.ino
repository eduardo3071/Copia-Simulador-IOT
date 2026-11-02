// Módulo LDR (AO em A0, DO em D2), potenciômetro deslizante em A1 e LED RGB em 9/10/11.
const int R = 9;
const int G = 10;
const int B = 11;

void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT);
  pinMode(R, OUTPUT);
  pinMode(G, OUTPUT);
  pinMode(B, OUTPUT);
}

void loop() {
  int luz = analogRead(A0);        // maior = mais escuro
  int brilho = analogRead(A1) / 4; // 0-255
  bool escuro = digitalRead(2) == HIGH;
  if (escuro) {
    analogWrite(R, 0);
    analogWrite(G, 0);
    analogWrite(B, brilho);
  } else {
    analogWrite(R, brilho);
    analogWrite(G, brilho / 2);
    analogWrite(B, 0);
  }
  Serial.print("AO=");
  Serial.print(luz);
  Serial.print(" DO=");
  Serial.print(escuro ? "escuro" : "claro");
  Serial.print(" brilho=");
  Serial.println(brilho);
  delay(200);
}