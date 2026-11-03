# Simulador IoT

Plataforma web para montar circuitos em protoboard, escrever e emular firmware Arduino, e gerar esquemático, PCB e arquivos de fabricação a partir da **mesma conectividade**.

Este repositório contém a **primeira entrega executável (P0)** do plano: Arduino Uno + LED + resistor (e botão/potenciômetro), Blink compilado e emulado, monitor serial, esquemático, PCB de 2 camadas e exportação Gerber/BOM/PnP, com projeto versionado e IDs estáveis.

Fase 5: **gabinete paramétrico** (base + tampa) gerado a partir do contorno e dos furos de montagem da PCB, com espessura e folgas ajustáveis, recortes manuais, visualização 3D e exportação STL.

## Rodando

Requisitos: Node 22.13+ (testado no 24), Windows/macOS/Linux.

```bash
npm install
npm run setup:arduino   # baixa arduino-cli 1.5.1 + arduino:avr 1.8.8 em tools/ (SHA-256 conferido)
npm run dev             # API em :8787 e web em http://localhost:5173
```

Sem o `setup:arduino`, os três exemplos ainda executam (o `.hex` pré-compilado vem nas fixtures), mas editar o código exige o compilador.

```bash
npm test          # testes de domínio, emulador, compilador, EDA e API
npm run typecheck
npm run build:fixtures   # recompila fixtures/*/firmware.hex e project.json
```

## Estrutura

| Caminho | Responsabilidade |
|---|---|
| `apps/web` | UI React: protoboard, código (Monaco), esquemático, PCB, monitor serial |
| `apps/api` | Fastify: projetos (SQLite), fila de compilação, artefatos, EDA, zip de fabricação |
| `workers/compiler` | arduino-cli com timeout, cancelamento, cache por hash e diagnósticos estruturados |
| `packages/project-model` | esquema versionado, migrações, comandos, undo/redo, chaves de invalidação |
| `packages/component-catalog` | peças verificadas: pinos ↔ visual ↔ pads, capacidades, proveniência |
| `packages/netlist` | nets derivadas de fios, encaixes e ligações internas |
| `packages/adapter-lab` | pinos do MCU ↔ circuito; solver DC resistivo simplificado |
| `packages/emulator-avr` | avr8js em Web Worker com protocolo versionado |
| `packages/adapter-eda` | projeto → tscircuit → Circuit JSON → Gerber/BOM/PnP |
| `packages/adapter-cad` | PCB + parâmetros → gabinete (Replicad/OpenCascade em Web Worker) → STL |
| `fixtures/` | projetos de referência: Blink, Botão+LED, Potenciômetro+ADC, Sensores+LCD (DHT22), Ultrassom+servo+buzzer, Luz+RGB, Contador 7 segmentos |
| `docs/adr/` | decisões: base do laboratório, modelo do projeto, escopo da PCB, gabinete |
| `docs/licencas.md` | inventário de licenças |

## O que é (e não é) simulado

- Firmware: ATmega328P real (avr8js) — GPIO, timers, PWM, USART, ADC. Sem SPI/I²C/EEPROM.
- Componentes (21): Uno, protoboard, resistor, capacitor, LED, LED RGB, 7 segmentos, barra de LEDs, buzzer, servo, LCD 16x2, botão, potenciômetros (rotativo e deslizante), módulo LDR, DHT22 e HC-SR04, mais bateria 9 V, fonte 12 V, interruptor de balancim e LM317 (circuitos sem microcontrolador, como os exemplos do suporte do pregoscópio). DHT22, HC-SR04 e LCD têm o protocolo emulado (ADR-005).
- Circuito: **avaliação lógica/resistiva simplificada** (resistores lineares, fontes ideais, LED como indicador de limiar). Não é SPICE; isso é a fase 3 do plano.
- PCB: autorroteamento do tscircuit, sem paridade de DRC com KiCad. Inspecione os Gerbers num visualizador independente antes de fabricar.
- Gabinete: só contorno retangular; recortes posicionados à mão (nada é inferido da aparência das peças); alturas das peças não são conferidas. Imprima uma peça de teste antes.

Detalhes e limitações: `docs/adr/`.

## Licença

MIT — ver `LICENSE` e `docs/licencas.md`.