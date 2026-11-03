# Guia de montagem: suporte e luz do pregoscópio

Revisão 2 (03/11/2026). Gerado por `scripts/build-suporte.ts`, `scripts/build-eletronica.ts` e `scripts/build-lista-de-compras.ts`; os parâmetros estão em `packages/adapter-cad/src/holder.ts`.

> **Status: projeto digital completo, nada impresso nem montado ainda.** Tudo o que não foi medido ou testado na bancada está na seção "O que ainda não foi verificado". Imprima antes os gabaritos de `CALIBRACAO.md` e depois a abraçadeira, antes das peças grandes.

> Cada peça tem um identificador (M1 a M4 impressas, P1 a P10 do pregoscópio, D1, D2, R1, C1, SW1, BT1, PS1, J1, U1, RV1 e PCB1 eletrônicas, H1 a H3 parafusos, G1 a G3 gabaritos). A página **Suporte do Pregoscópio** do site mostra cada um no modelo 3D com a especificação e o motivo da escolha (`#suporte` no endereço do site).

## 1. O que é
Um suporte em C que segura o pregoscópio na vertical, com uma caixa luminosa na base. A lâmina desliza num canal no topo da caixa, sob a objetiva, e um LED branco ilumina por baixo. O pregoscópio (tubo telescópico com objetiva) é impresso à parte.

Duas versões, que dividem a abraçadeira, o difusor e o estágio de corrente constante (LM317 com R1 de 68 Ω):
- **v1, pilha:** pilha de 9 V, interruptor e LED. O brilho fica fixo em 18,4 mA mesmo com a pilha descarregando.
- **v2, fonte:** adaptador de tomada, diodo contra polaridade invertida, interruptor e botão de brilho com corrente constante (sem PWM, para não dar faixas na câmera).

## 2. Arquivos
```
pacote-montagem/
  GUIA-DE-MONTAGEM.md, CALIBRACAO.md, visualizador-3d.html
  lista-de-compras-v1.csv, lista-de-compras-v2.csv   (o que procurar na loja; preço em branco)
  mecanica/
    comum/        abracadeira-tubo.stl, difusor.stl (+ versão em posição de impressão)
    v1-pilha/     suporte-base-coluna.stl, tampa-fundo.stl (+ -impressao.stl)
    v2-fonte/     suporte-base-coluna.stl, tampa-fundo.stl (+ -impressao.stl)
    calibracao/   calibracao-tubo.stl, calibracao-pecas.stl, calibracao-bateria.stl
  eletronica/
    v1-pilha/         esquematico.svg, bom.csv, pick-and-place.csv, gerber/  (placa 40 × 25 mm)
    v2-fonte-dimmer/  esquematico.svg, bom.csv, pick-and-place.csv, gerber/  (placa 70 × 25 mm)
```
Os arquivos `*-impressao.stl` já estão deitados sobre a face de trás da coluna (90 × 210 mm de mesa, 115 mm de altura), o que cabe em mesa de 30 cm. Os demais ficam na posição de montagem (210,2 mm de altura) e servem para visualizar.

## 3. Medidas usadas
| Peça | Valor | Origem |
|---|---|---|
| Tubo externo | ⌀ 33,5 mm, 115 mm | paquímetro (o STEP V1 diz 30 mm) |
| Tubo interno (telescópico) | ⌀ 22,5 mm, curso de 40 mm, total 155 mm | paquímetro |
| Objetiva | ⌀ 20 mm, sai 35 mm do tubo interno | paquímetro |
| Parte visível do tubo interno, recolhido | 9 mm | fotos (regra de três) |
| Lâmina | 76 × 26 × 1 mm | padrão, **não medida** |
| Pilha 9 V | 48,5 × 26,5 × 17,5 mm | padrão |
| Interruptor de balancim KCD1-101 (furo) | 21,2 × 15,0 mm | guia da LCSC; **não conferido** |
| Conector DC-022B (furo) | 7,8 mm | anúncios de venda; **não conferido** |

Alturas resultantes: lente frontal a 0,8 mm acima da lâmina, tubo externo de z = 95,2 a 210,2 mm, anel da abraçadeira (22 mm) no topo.

## 4. Lista de materiais
A lista completa de compras, com o que digitar na loja e a confiança em cada número, está em `lista-de-compras-v1.csv` e `lista-de-compras-v2.csv` (abrem no Excel). Resumo:

### Comum às duas versões
| ID | Qtd | Item |
|---|---|---|
| D1 | 1 | LED branco 5 mm difuso, ângulo de 100° ou mais (Vf ≈ 3,1 V) |
| R1 | 1 | Resistor 68 Ω, 1/4 W, 1 % (azul, cinza, preto, dourado) |
| C1 | 1 | Capacitor cerâmico 100 nF (104), 50 V |
| U1 | 1 | LM317T, TO-220 |
| SW1 | 1 | Interruptor de balancim KCD1-101, 2 terminais |
| PCB1 | 1 | Placa do driver (Gerbers incluídos, ou placa perfurada com os mesmos furos) |
| H1 | 4 | Parafuso M3 × 10 autoatarraxante (tampa de fundo) |
| H2 | 2 | Parafuso M3 × 16 autoatarraxante (abraçadeira) |
| H3 | 4 | Parafuso M3 × 8 autoatarraxante (placa do driver) |
| — | — | Fio flexível fino, termorretrátil, fita dupla face ou cola quente |

### Só v1 (pilha)
| ID | Qtd | Item |
|---|---|---|
| BT1 | 1 | Pilha 9 V alcalina (6F22) com clipe de fios |

### Só v2 (fonte)
| ID | Qtd | Item |
|---|---|---|
| PS1 | 1 | Fonte 12 V, 500 mA, plugue P4 5,5 × 2,1 mm com centro positivo |
| J1 | 1 | Conector P4 fêmea de painel DC-022B (furo de 7,8 mm) |
| D2 | 1 | Diodo 1N5819 (Schottky 1 A) |
| RV1 | 1 | Reostato linear 220 Ω com eixo de 6 mm (WH148 B221) e botão |

## 5. Eletrônica
As duas versões usam o LM317 como **fonte de corrente**: o LM317 mantém 1,25 V sobre R1, então a corrente do LED é 1,25 V ÷ R1, não importa a tensão de entrada (acima do mínimo).

### v1
Pilha 9 V → interruptor SW1 → U1 (IN); U1 (OUT) → R1 (68 Ω) → ADJ → LED D1 → GND. C1 de 100 nF entre IN e GND. Esquemático em `eletronica/v1-pilha/esquematico.svg`.

- Corrente: 1,25 V ÷ 68 Ω = **18,4 mA**, abaixo dos 20 mA do LED, e constante enquanto a pilha estiver acima de **6,35 V** (3,1 V do LED + 1,25 V + 2 V de queda do LM317).
- Autonomia: cerca de **22 horas** (80 % dos 500 mAh de uma alcalina, até a pilha cair a 6,35 V). Abaixo disso o LED escurece; é o sinal para trocar a pilha.
- Dissipação: R1 23 mW, U1 85 mW. Nenhum precisa de dissipador.
- Uma versão mais simples, sem LM317 (resistor de 330 Ω direto), funciona, mas o brilho cai de 18 mA para 12 mA conforme a pilha descarrega.
- Para um LED só, uma PCB não é necessária: solde os fios direto. Os Gerbers são opcionais.

### v2
Fonte 12 V no conector J1 → diodo D2 → interruptor SW1 → U1 (IN); U1 (OUT) → R1 (68 Ω) → reostato RV1 (220 Ω) → ADJ → LED D1 → GND. C1 de 100 nF entre IN e GND. Esquemático em `eletronica/v2-fonte-dimmer/esquematico.svg`.

- Corrente = 1,25 V ÷ (68 Ω + posição do reostato): de **18,4 mA** (reostato em 0 Ω) a **4,3 mA** (220 Ω).
- O D2 (1N5819, Schottky) impede que um plugue com polaridade invertida chegue ao LM317. Ele derruba cerca de 0,4 V; a entrada mínima da fonte fica em **6,75 V**, e os 12 V sobram.
- O LM317 precisa de uma corrente mínima de uns 3,5 mA para regular; o piso de 4,3 mA fica logo acima. **Não use um reostato maior que 220 Ω.**
- Dissipação: U1 até 133 mW, sem dissipador.
- O reostato é linear (é o que se acha em 220 Ω); a mudança de brilho fica concentrada no lado claro.
- Brilho sem PWM de propósito: com a câmera do celular, PWM gera faixas na imagem.

### Plano de teste com o multímetro
Meça nesta ordem, com o interruptor ligado. A primeira leitura fora da faixa mostra onde procurar o erro. A mesma tabela está na aba Eletrônica do site.

**v1 (pilha nova de 9 V, LED de 3,1 V)**

| Ponto | Esperado | Faixa | Se estiver fora |
|---|---|---|---|
| Pilha BT1: + para − | 9,00 V | 8,4 a 9,7 V | pilha fraca, clipe mal encaixado ou invertido |
| Entrada do U1 (depois do SW1) para GND | 9,00 V | 8,3 a 9,7 V | interruptor aberto, solda fria |
| Saída do U1 (OUT) para GND | 4,35 V | 4,1 a 4,6 V | R1 aberto ou LED invertido (a saída sobe até perto da entrada) |
| Ânodo do D1 (pino ADJ) para GND | 3,10 V | 2,8 a 3,4 V | LED invertido (0 V) ou queimado |
| Sobre R1 (entre OUT e ADJ) | 1,25 V | 1,2 a 1,3 V | LM317 falso ou fora de regulação |
| Corrente do LED, multímetro em série | 18,4 mA | 17,4 a 19,4 mA | R1 errado (confira as faixas) ou LM317 sem regulação |

**v2 (fonte de 12 V, LED de 3,1 V)**

| Ponto | Esperado | Faixa | Se estiver fora |
|---|---|---|---|
| Fonte no J1: + para −, sem carga | 12,00 V | 11,5 a 15 V | fonte não regulada lê até 15 V sem carga |
| Depois do D2 para GND | 11,60 V | 11 a 11,8 V | diodo invertido (0 V) ou queda acima de 0,5 V |
| Entrada do U1 (depois do SW1) para GND | 11,60 V | 10,9 a 11,8 V | interruptor aberto, solda fria |
| Saída do U1 (OUT) para GND | 4,35 V | 4,1 a 4,6 V | R1 ou RV1 abertos |
| Ânodo do D1 (pino ADJ) para GND | 3,10 V | 2,8 a 3,4 V | LED invertido ou queimado |
| Sobre R1 + RV1 (entre OUT e ADJ) | 1,25 V | 1,2 a 1,3 V | LM317 falso ou fora de regulação |
| Corrente com RV1 no mínimo (0 Ω) | 18,4 mA | 17,0 a 19,4 mA | R1 errado ou cursor do RV1 sem ligação |
| Corrente com RV1 no máximo (220 Ω) | 4,3 mA | 3,9 a 4,8 mA | reostato maior que 220 Ω: o LM317 pode oscilar |

## 6. Impressão
Material PLA, camada de 0,2 mm, 3 perímetros, enchimento de 20 a 30 %.

| Peça | Orientação | Suportes |
|---|---|---|
| Abraçadeira | arquivo `-impressao` (abre para cima) | não |
| Suporte base + coluna | arquivo `-impressao` (deitado nas costas) | sim, dentro da caixa (teto da caixa em ponte de 85 mm) |
| Tampa de fundo | já plana | não |
| Difusor | plano, em PLA natural ou branco, 1 a 2 camadas | não |

Cor escura nas paredes ajuda a evitar luz espalhada. Imprima na ordem do roteiro (seção 9).

## 7. Montagem
1. Imprima, remova suportes e limpe os furos com uma broca de 3 mm onde estiver rugoso.
2. Cole o difusor no encaixe do teto da caixa, por dentro.
3. Instale o interruptor no recorte da frente. Mantenha a rosca livre.
4. **v2:** instale o conector de força na lateral direita e o botão do reostato na frente.
5. Monte o circuito (seção 5) na placa do driver. Solde e isole os fios.
6. Encaixe o LED no porta-LED da tampa, com o flange na sede e as pernas pelo furo. Passe os fios pelo furo da tampa. Parafuse a placa do driver nos 4 suportes da tampa (M3 × 8). **v1:** coloque também a pilha no berço.
7. Faça o plano de teste da seção 5 antes de fechar.
8. Feche a tampa com 4 parafusos M3 × 10. Cuide para não prender fio.
9. Encaixe o pregoscópio no anel da coluna: tire a metade da abraçadeira, encoste o tubo de lado, recoloque e aperte os 2 parafusos M3 × 16 sem forçar.
10. Foco: afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno do pregoscópio, até a imagem ficar nítida.

## 8. O que ainda não foi verificado
- **Nada foi impresso nem montado.** Todas as folgas (0,2 mm no furo do tubo, 0,6 mm de abertura da abraçadeira, 0,4 mm no difusor e no LED) são valores típicos de FDM.
- Medidas ainda por conferir: lâmina real, furo do interruptor e do conector, diâmetro do tubo externo com mais de um ponto de medição, quanto a objetiva sai do tubo.
- Distância de trabalho de 0,8 mm é um valor típico de objetiva 40x/0,65; confirme com a sua.
- O LED a cerca de 10 mm da janela pode iluminar de forma irregular; o difusor deve resolver, mas só o teste confirma.
- Os Gerbers passaram numa checagem independente (`scripts/verificar-gerber.py`, com gerbonara): contorno, furos dentro da placa, furos de montagem nos lugares dos suportes e cobre a mais de 3 mm da borda. **As trilhas e a máscara ainda não foram vistas num programa de PCB** (KiCad GerbView); faça isso antes de fabricar.
- O circuito foi calculado e simulado no simulador (corrente contínua, fonte ideal, LED por limiar), mas **não foi medido com multímetro**. O plano de teste da seção 5 serve para isso.
- Os valores de interruptor, conector e reostato vêm de guias e anúncios, não de datasheet oficial.

## 9. Roteiro de teste
1. Imprimir os gabaritos G1 a G3 e provar as peças reais; atualizar `holder.ts` (ver `CALIBRACAO.md`).
2. Imprimir só a abraçadeira e provar no tubo. Ajustar `boreClearance` e `clampGap` se estiver folgada ou apertada.
3. Imprimir a tampa de fundo e provar no LED, na placa e na pilha.
4. Montar o circuito fora da caixa e fazer o plano de teste da seção 5.
5. Imprimir o suporte completo, montar e conferir altura e foco com a lâmina.
6. Registrar os ajustes em `holder.ts` e regenerar com `npx tsx scripts/build-suporte.ts`.
