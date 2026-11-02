# ADR-005 — Componentes adicionais e dispositivos emulados

- **Status:** aceita
- **Data:** 19/10/2026
- **Código:** `packages/component-catalog/src/parts-extra.ts`, `packages/emulator-avr/src/devices.ts`, `packages/adapter-lab/src/lab.ts`

## Decisão

O catálogo passou de 6 para 17 peças. Cada peça tem visual, pinagem, footprint e modelo de simulação conferidos por testes. Há três níveis de simulação:

| Nível | Peças | Como funciona |
|---|---|---|
| Lógico/resistivo (laboratório) | LED, LED RGB, 7 segmentos, barra de LEDs, buzzer, servo, potenciômetros, módulo LDR | `evaluateLab`: junções de LED genéricas (`simulation.leds`), largura de pulso → ângulo, frequência de comutação → tom, LDR como fonte de Thévenin |
| Protocolo emulado (no worker, em ciclos de CPU) | DHT22, HC-SR04, LCD 16x2 HD44780 | o dispositivo observa as escritas nas portas e responde agendando eventos de relógio do avr8js (`addClockEvent`) |
| Só catálogo/PCB | Capacitor | circuito aberto em DC; carga/descarga exige a fase 3 |

## Detalhes verificados

- **DHT22**: início ≥ 500 µs em nível baixo; resposta 80/80 µs; 40 bits (50 µs baixo + 26 µs ou 70 µs alto); temperatura negativa com bit de sinal; checksum. A biblioteca Adafruit 1.4.7 lê 24,0 °C / 40,0 % e −5,5 °C / 65,2 % no firmware real.
- **LCD**: inicialização em 4 bits do LiquidCrystal 1.0.7, limpar, cursor, endereço da segunda linha (0x40), deslocamento. CGRAM é aceita mas não desenhada.
- **HC-SR04**: TRIG ≥ 10 µs → ECHO de 58,31 µs/cm após 450 µs; fora de 2–400 cm o pulso é de 38 ms, o que estoura o timeout de 30 ms do exemplo.
- **Servo**: 544–2400 µs → 0–180° (padrões da biblioteca Servo 1.3.0); ângulo mantido quando o sinal some.
- **PWM por hardware**: o timer muda o pino sem alterar o PORTx, então o emulador reporta o nível efetivo do pino. Achado durante a verificação: o verde do LED RGB ficava apagado com `analogWrite(127)`.
- **Precedência de níveis numa entrada**: dispositivo emulado > circuito (laboratório) > pull-up interno de pino flutuante.

## Bibliotecas Arduino

Fixadas em `workers/compiler/toolchain.json` e instaladas com `--no-deps` (as dependências também são fixadas):

| Biblioteca | Versão | Licença |
|---|---|---|
| Servo | 1.3.0 | LGPL-2.1 |
| LiquidCrystal | 1.0.7 | LGPL-2.1 |
| DHT sensor library | 1.4.7 | MIT |
| Adafruit Unified Sensor | 1.1.15 | Apache-2.0 |

O compilador usa uma configuração com sketchbook vazio e passa `--library` só para as bibliotecas que o projeto declara (`firmware.libraries`, editável no seletor da aba Código). Uma biblioteca não declarada não é visível na compilação.

## PCB

- `chip`: LED RGB (`pinrow4`), buzzer (`pinrow2_p7.62mm`), 7 segmentos (`dip10_w15.24mm`, numeração do display de 10 pinos, COM.1/COM.2 ligados internamente), barra (`dip20_w7.62mm`), DHT22 (`pinrow4`).
- `module` (vira o conector em que a peça se encaixa): servo (3), HC-SR04 (4), módulo LDR (4), potenciômetro deslizante (3), LCD (16).
- Placas pequenas demais geram falha de empacotamento no tscircuit; o adaptador avisa para aumentar a placa (o exemplo do contador usa 100×80 mm).

## Limitações

- LED RGB e 7 segmentos só em **catodo comum**; display de 1 dígito.
- O buzzer não toca som; a frequência aparece no painel.
- O LCD é paralelo; a versão I²C exigiria emular o TWI.
- Teste intermitente: dois processos do arduino-cli compilando o core ao mesmo tempo (arquivos de teste em paralelo) falharam uma vez em três execuções. A API usa fila com concorrência 1, então isso não ocorre em uso normal.