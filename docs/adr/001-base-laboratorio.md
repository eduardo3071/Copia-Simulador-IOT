# ADR-001 — Base do laboratório (protoboard + firmware + emulação)

- **Status:** aceita
- **Data:** 19/10/2026
- **Contexto do plano:** fase 0, seção 3.1 e 13

## Decisão

Integração **modular** com bibliotecas MIT, sem fork do Velxio:

| Função | Projeto | Versão fixada | Licença |
|---|---|---|---|
| Emulação ATmega328P | avr8js | 0.21.1 | MIT |
| Visual de placas e componentes | @wokwi/elements | 1.9.2 | MIT |
| Compilação | arduino-cli + core arduino:avr | 1.5.1 / 1.8.8 | GPL-3.0 (ferramenta externa, não distribuída com o código) |
| Editor | monaco-editor + @monaco-editor/react | 0.57.0 / 4.7.0 | MIT |

## Motivos

1. **Licença.** O repositório é MIT. O Velxio declara AGPLv3; um fork obrigaria o produto inteiro a ser AGPL. O próprio plano prevê `avr8js + Arduino CLI` como alternativa se a base não servir.
2. **Os blocos que o Velxio integra são, em grande parte, as mesmas bibliotecas abertas da Wokwi.** Usá-las diretamente evita herdar a estrutura de outro produto e permite adaptadores próprios (regra "fork muito divergente" da seção 10).
3. O arduino-cli roda como **processo externo** num worker; não é linkado nem empacotado, então a GPL dele não contamina o código da plataforma. A instalação é feita por `npm run setup:arduino`, que confere o SHA-256 publicado.

## O que foi comprovado (provas de conceito com testes automatizados)

- Blink compilado pelo arduino-cli roda no avr8js: PB5 alterna a cada 500 ms de **tempo simulado** e o USART imprime no monitor serial (`packages/emulator-avr/test`).
- Entrada digital com `INPUT_PULLUP`, leitura de ADC (A0 = 2,5 V → 511/512) e reset funcionam.
- Pull-up interno de pino flutuante é resolvido **dentro do emulador, na mesma instrução** que o habilita; sem isso, o firmware via um "pressionado" falso no boot.

## Medições (máquina de desenvolvimento, Windows 11, Node 24)

| Medida | Valor |
|---|---|
| Primeira compilação (inclui build do core) | ~6,1 s |
| Recompilação após editar o sketch | ~4,6 s |
| Cache de compilação (mesmas fontes/toolchain) | ~4 ms |
| Emulador (Node, sem UI) | ~2,8× tempo real; +0,9 MB de heap |

## Limitações conhecidas

- Só **Arduino Uno (ATmega328P)**; ESP32 fica para a fase 6 (Espressif QEMU).
- Periféricos emulados: GPIO B/C/D, Timers 0/1/2, USART0, ADC. **Não** emulados: SPI, I²C (TWI), EEPROM, watchdog, sleep.
- Entradas vindas do circuito chegam ao MCU com atraso de até um ciclo de relatório (~33 ms). Bom para botões e potenciômetros; **não** serve para realimentação analógica rápida (exige co-simulação, fase 3).
- O tempo simulado é regulado pelo relógio de parede; se a máquina não acompanhar, a simulação fica em câmera lenta e a UI mostra a porcentagem do tempo real.
- Compilação ainda não roda em container: há timeout (60 s), limite de log, ambiente mínimo (sem segredos herdados), nomes de arquivo validados e cancelamento com kill da árvore de processos. **Isolamento por container é pré-requisito antes de expor a API a usuários externos** (seção 8).