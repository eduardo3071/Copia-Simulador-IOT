// HC-SR04 (TRIG=7, ECHO=8) aponta o servo (pino 9) e o buzzer (pino 10) apita abaixo de 20 cm.
#include <Servo.h>

const int TRIG = 7;
const int ECHO = 8;
const int BUZZER = 10;
Servo servo;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  servo.attach(9);
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 30000UL);
  float cm = us / 58.0;
  int angle = constrain(map((long)cm, 2, 200, 0, 180), 0, 180);
  servo.write(angle);
  if (us > 0 && cm < 20) tone(BUZZER, 1000);
  else noTone(BUZZER);
  Serial.print("Distancia: ");
  Serial.print(cm, 1);
  Serial.print(" cm  angulo: ");
  Serial.println(angle);
  delay(100);
}