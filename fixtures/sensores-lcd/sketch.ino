// DHT22 no pino 7; LCD 16x2 em modo 4 bits (RS=12, E=11, D4=5, D5=4, D6=3, D7=2).
#include <LiquidCrystal.h>
#include <DHT.h>

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
DHT dht(7, DHT22);

void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);
  lcd.print("Iniciando...");
  dht.begin();
}

void loop() {
  delay(2000);
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  lcd.clear();
  if (isnan(h) || isnan(t)) {
    lcd.print("Falha no DHT22");
    Serial.println("Falha ao ler o DHT22");
    return;
  }
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(t, 1);
  lcd.print(" C");
  lcd.setCursor(0, 1);
  lcd.print("Umid: ");
  lcd.print(h, 1);
  lcd.print(" %");
  Serial.print("T=");
  Serial.print(t, 1);
  Serial.print(" H=");
  Serial.println(h, 1);
}