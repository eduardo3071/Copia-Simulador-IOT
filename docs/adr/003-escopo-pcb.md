# ADR-003 — Escopo do editor de esquemático/PCB (primeiro incremento)

- **Status:** aceita
- **Data:** 19/10/2026
- **Código:** `packages/adapter-eda`, `apps/web/src/components/{SchematicView,PcbView}.tsx`

## Decisão

- Conversão **projeto → tscircuit (`@tscircuit/core` 0.0.2178) → Circuit JSON** no servidor (`POST /api/eda`), protegida por mutex (renderização usa CPU).
- **Esquemático:** SVG gerado por `circuit-to-svg` no servidor e exibido na UI com zoom. O `@tscircuit/schematic-viewer` foi descartado neste incremento porque depende do meta-pacote `tscircuit` inteiro como peer.
- **PCB:** `@tscircuit/pcb-viewer` no navegador, com movimentação de componentes. A primeira edição grava a posição de **todas** as peças no projeto ("Fixar posições"); antes disso o layout é empacotado automaticamente.
- **Roteamento:** autorroteador padrão do tscircuit (2 camadas). Freerouting não foi integrado: o autorroteador existente roteou os casos de referência sem erros.
- **Fabricação:** `circuit-json-to-gerber` (Gerbers + furação), `circuit-json-to-bom-csv`, `circuit-json-to-pnp-csv`, empacotados num zip com `LEIA-ME.txt` (revisão, limitações, avisos).

## Mapeamento de peças

| Projeto | Na PCB |
|---|---|
| Arduino Uno | conector `J_U1` (`pinrowN`) apenas com os pinos usados; pinos ligados internamente (GND.1/2/3) viram um só |
| Protoboard | não existe na PCB; os furos colapsam em nets |
| Resistor | `axial_p0.4in` (alternativas `axial_p0.3in`, `0805`) |
| LED 5 mm | `pinrow2` (pin1 = anodo) — `led5mm` não é aceito pelo footprinter |
| Botão | `pushbutton` com `internallyConnectedPins` derivados do catálogo; testado que os pares ligados ficam a 6,5 mm (botão tátil padrão) |
| Potenciômetro | `potentiometer`, `pinVariant: three_pin`, pin2 = cursor |

## Verificado por testes

- Toda net do projeto com ≥ 2 pinos na placa aparece conectada no Circuit JSON (`circuit-json-to-connectivity-map`), e nets distintas continuam distintas.
- Todo pino de peça fabricável tem `pcb_port`; trilhas são geradas sem erros nos casos de referência.
- Zip contém Gerbers, BOM, PnP e Circuit JSON, todos com a revisão.
- Achado durante a verificação: sem `internallyConnectedPins`, o tscircuit tratava duas pernas sempre ligadas do botão como os contatos da chave (erro "both schematic contacts connected to the same net"). Corrigido e coberto por teste.

## Fora do escopo (não prometido)

- Edição de trilhas, vias, planos de cobre e regras de projeto; DRC equivalente a KiCad/EasyEDA.
- Rotação de peças na PCB pela UI (o modelo já guarda `rotation`).
- Footprints além dos listados; modelos 3D.
- **Ainda não feito:** inspeção dos Gerbers num visualizador independente (ex.: KiCad GerbView). Passo obrigatório antes de qualquer fabricação real.