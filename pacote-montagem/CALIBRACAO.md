# Calibração por impressão

Em vez de medir com paquímetro, imprima duas placas pequenas e prove as peças reais nos furos. Os arquivos estão em `mecanica/calibracao/` e são gerados por `scripts/build-calibracao.ts`.

| Arquivo | Tamanho | Para quê |
|---|---|---|
| `calibracao-tubo.stl` | 270 × 44 × 3,6 mm | diâmetro do tubo externo do pregoscópio |
| `calibracao-pecas.stl` | 174 × 208 × 3,6 mm | lâmina, interruptor, LED, parafuso M3, conector P4 e eixo do reostato |

Imprima com as **mesmas configurações das peças finais** (PLA, 0,2 mm, mesmo bico), deitadas e sem suportes. Cada série cresce da esquerda para a direita. Os pontinhos em relevo acima de cada furo indicam a posição: 1 ponto é o primeiro furo, 2 pontos o segundo, e assim por diante.

## Como ler cada série
Experimente a peça real em cada furo, do menor para o maior, e escolha o **menor furo em que ela entra e desliza sem folga excessiva**. Depois use a tabela para achar o valor e atualizar o parâmetro em `packages/adapter-cad/src/holder.ts`.

| Série | Furos (1, 2, 3, ...) em mm | Peça a provar | Parâmetro a atualizar |
|---|---|---|---|
| `tubo` | 33,4 · 33,6 · 33,8 · 34,0 · 34,2 · 34,4 · 34,6 | tubo externo | `tubeDiameter` = valor escolhido − 0,2 |
| `lamina` | 26,2 · 26,4 · 26,6 · 26,8 · 27,0 (rebaixo de 1,2 mm) | lâmina deitada | `slideWidth` = valor escolhido − 0,6 |
| `interruptor` | 19×13 · 20×14 · 21×15 · 22×16 | interruptor de frente | `switchCutout` (largura e altura) = valor escolhido |
| `led` | 5,8 · 6,0 · 6,2 · 6,4 · 6,6 | flange do LED de 5 mm | `ledFlange` = valor escolhido − 0,4 |
| `parafuso-m3` | 2,4 · 2,6 · 2,8 | parafuso M3 autoatarraxante | `pilotHole` = valor onde ele entra apertado, mas rosqueia |
| `conector-p4` | 10 · 11 · 12 | rosca do conector P4 (v2) | `jackDiameter` = valor escolhido |
| `eixo-reostato` | 7 · 7,5 · 8 | eixo do reostato (v2) | `knobDiameter` = valor escolhido |

Se a peça não entrar nem no maior furo de uma série, me diga: preciso de uma série com furos maiores.

## Depois
1. Edite os valores em `holder.ts`.
2. Rode `npx tsx scripts/build-suporte.ts` para gerar os STLs novos.
3. Rode `npx vitest run packages/adapter-cad` para conferir os testes.

## O que a calibração não substitui
- **Pilha:** é uma decisão sua (9 V ou outra). Não se mede.
- **Quanto a objetiva sai do tubo** (parâmetros `sleeveLength` e `objectiveLength`): não cabe numa placa. Meça com régua ou paquímetro, da ponta do tubo interno recolhido até a lente.
- **Folgas do conjunto montado** (anel da abraçadeira, difusor): só aparecem nas peças reais. Veja o roteiro de teste do guia.
