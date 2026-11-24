# Guia de montagem: suporte e luz do pregoscópio

Revisão 5 (24/11/2026). Gerado por `scripts/build-suporte.ts`, `scripts/build-eletronica.ts` e `scripts/build-lista-de-compras.ts`; os parâmetros estão em `packages/adapter-cad/src/holder.ts`. Este guia cobre a **400x (v1 e v2)** e, na seção 10, a **1000x econômica** (só v2), que também tem manual próprio, `MANUAL-v2-1000x-pt.pdf` (e `-zh`, `-en`), e custos em `CUSTOS-v2-1000x-1un.csv`.

> **Status: projeto digital completo, nada impresso nem montado ainda.** Tudo o que não foi medido ou testado na bancada está na seção "O que ainda não foi verificado". Imprima antes os gabaritos de `CALIBRACAO.md` e depois a abraçadeira, antes das peças grandes.

> Cada peça tem um identificador (M1 a M4 impressas, P1 a P10 do pregoscópio, D1, D2, R1, C1, SW1, BT1, PS1, J1, U1, RV1 e PCB1 eletrônicas, H1 a H3 parafusos, G1 a G3 gabaritos). A página **Suporte do Pregoscópio** do site mostra cada um no modelo 3D com a especificação e o motivo da escolha (`#suporte` no endereço do site).

## 1. O que é
Um suporte em C que segura o pregoscópio na vertical, com uma caixa luminosa na base. A lâmina desliza num canal no topo da caixa, sob a objetiva, e um LED branco ilumina por baixo. O pregoscópio (tubo telescópico com objetiva) é impresso à parte.

Duas versões de 400x, que dividem a abraçadeira, o difusor e o estágio de corrente constante (LM317 com R1 de 68 Ω):
- **v1, pilha:** pilha de 9 V, interruptor e LED. O brilho fica fixo em 18,4 mA mesmo com a pilha descarregando.
- **v2, fonte:** adaptador de tomada, diodo contra polaridade invertida, interruptor e botão de brilho com corrente constante (sem PWM, para não dar faixas na câmera).

A **1000x econômica** usa a caixa da v2 com uma objetiva de imersão 100x e uma luz de 3 W; ela está na seção 10.

## 2. Arquivos
```
pacote-montagem/
  GUIA-DE-MONTAGEM.md, CALIBRACAO.md, visualizador-3d.html
  MANUAL-v1-*.pdf, MANUAL-v2-*.pdf, MANUAL-v2-1000x-*.pdf   (manual de construção em pt, zh e en; um PDF por idioma)
  lista-de-compras-v1.csv, lista-de-compras-v2.csv   (o que procurar na loja; preço em branco)
  CUSTOS-*.csv   (custo por versão, com preço de loja, para 1 e para 100 unidades)
  mecanica/
    comum/        abracadeira-tubo.stl, difusor.stl (+ versão em posição de impressão)
    v1-pilha/     suporte-base-coluna.stl, tampa-fundo.stl (+ -impressao.stl)
    v2-fonte/     suporte-base-coluna.stl, tampa-fundo.stl (+ -impressao.stl)
    v2-1000x/     suporte-base-coluna.stl, tampa-fundo.stl, tubo-de-luz.stl, roda-de-aberturas.stl, abracadeira-tubo.stl (+ -impressao.stl)
    calibracao/   calibracao-tubo.stl, calibracao-pecas.stl, calibracao-bateria.stl
  eletronica/
    v1-pilha/         esquematico.svg, bom.csv, pick-and-place.csv, gerber/  (placa 40 × 25 mm)
    v2-fonte-dimmer/  esquematico.svg, bom.csv, pick-and-place.csv, gerber/  (placa 70 × 25 mm)
    v2-fonte-dimmer-gerber.zip   (os Gerbers e as furações da v2, prontos para enviar à fábrica)
    v2-1000x/         esquematico.svg   (sem placa própria: o driver vai numa placa ilhada de 40 × 25 mm)
```
Os arquivos `*-impressao.stl` já estão deitados sobre a face de trás da coluna (90 × 228,2 mm de mesa, 115 mm de altura; na 1000x, 90 × 237,6 mm). **A mesa precisa ter mais de 230 mm no lado maior (240 mm na 1000x):** uma mesa de 220 × 220 mm não comporta a peça. Os demais ficam na posição de montagem (228,2 mm de altura) e servem para visualizar.

## 3. Medidas usadas
| Peça | Valor | Origem |
|---|---|---|
| Tubo externo | ⌀ 33,5 mm, 115 mm | paquímetro (o STEP V1 diz 30 mm) |
| Tubo interno (telescópico) | ⌀ 22,5 mm, curso de 40 mm, total 155 mm | paquímetro |
| Objetiva | ⌀ 20 mm, sai 35 mm do tubo interno | paquímetro |
| Parte visível do tubo interno, recolhido | 9 mm | fotos (regra de três) |
| Tubo interno no foco nominal | estendido 37 mm no total (9 mm que já aparecem recolhido + 28 mm puxados), o que deixa o tubo mecânico em cerca de 152 mm (a objetiva 160/0,17 pede 160 mm) | calculado; confirme no foco real |
| Lâmina | 76 × 26 × 1 mm | padrão, **não medida** |
| Pilha 9 V | 48,5 × 26,5 × 17,5 mm | padrão |
| Interruptor de balancim KCD1-101 (furo) | 21,2 × 15,0 mm | guia da LCSC; **não conferido** |
| Conector DC-022B (furo) | 7,8 mm | anúncios de venda; **não conferido** |

Alturas resultantes: lente frontal a 0,8 mm acima da lâmina, tubo externo de z = 113,2 a 228,2 mm, anel da abraçadeira (22 mm) no topo.

## 4. Lista de materiais
A lista completa de compras, com o que digitar na loja e a confiança em cada número, está em `lista-de-compras-v1.csv` e `lista-de-compras-v2.csv` (abrem no Excel). Resumo:

### Comum às duas versões
| ID | Qtd | Item |
|---|---|---|
| D1 | 1 | LED branco 5 mm difuso, ângulo de 100° ou mais (Vf ≈ 3,1 V) |
| R1 | 1 | Resistor 68 Ω, 1/4 W, 1 % (azul, cinza, preto, dourado, marrom) |
| C1 | 1 | Capacitor cerâmico 100 nF (104), 50 V |
| U1 | 1 | LM317T, TO-220 |
| SW1 | 1 | Interruptor de balancim KCD1-101, 2 terminais |
| PCB1 | 1 | Placa do driver (Gerbers incluídos, ou placa perfurada com os mesmos furos). Peça espessura de **1,6 mm** na fábrica: os suportes da tampa são calculados para ela |
| H1 | 4 | Parafuso M3 × 10 autoatarraxante (tampa de fundo) |
| H2 | 2 | Parafuso M3 × 16 autoatarraxante (abraçadeira) |
| H3 | 4 | Parafuso M3 × 8 autoatarraxante (placa do driver) |
| W1 | 1 | Fio flexível 24 AWG: vermelho, preto e mais uma cor (v1: 6 fios de 6,5 a 13 cm; v2: 9 fios de 8,5 a 17 cm; os comprimentos de corte de cada fio estão na lista de corte do manual) |
| W2 | 1 | Tubo termorretrátil ⌀ 2 a 3 mm, 10 cm (uma luva de 1 cm por emenda) |
| W3 | 1 | Cola quente e fita dupla face (12 mm) |

### Só v1 (pilha)
| ID | Qtd | Item |
|---|---|---|
| BT1 | 1 | Pilha 9 V alcalina (6F22) com clipe de fios |

### Só v2 (fonte)
| ID | Qtd | Item |
|---|---|---|
| PS1 | 1 | Fonte 12 V, 1 A (a mesma da 1000x), plugue P4 5,5 × 2,1 mm com centro positivo |
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
| Saída do U1 (OUT) para GND | 4,35 V | 3,9 a 4,8 V | R1 aberto ou LED invertido (a saída sobe até perto da entrada) |
| Ânodo do D1 (pino ADJ) para GND | 3,10 V | 2,7 a 3,4 V | LED invertido (0 V) ou queimado |
| Sobre R1 (entre OUT e ADJ) | 1,25 V | 1,2 a 1,3 V | LM317 falso ou fora de regulação |
| Corrente do LED, multímetro em série | 18,4 mA | 17,4 a 19,4 mA | R1 errado (confira as faixas) ou LM317 sem regulação |

**v2 (fonte de 12 V, LED de 3,1 V)**

| Ponto | Esperado | Faixa | Se estiver fora |
|---|---|---|---|
| Fonte no J1: + para −, sem carga | 12,00 V | 11,5 a 15 V | fonte não regulada lê até 15 V sem carga |
| Depois do D2 para GND | 11,60 V | 11 a 11,8 V | diodo invertido (0 V) ou queda acima de 0,5 V |
| Entrada do U1 (depois do SW1) para GND | 11,60 V | 10,9 a 11,8 V | interruptor aberto, solda fria |
| Saída do U1 (OUT) para GND | 4,35 V | 3,9 a 4,8 V | R1 ou RV1 abertos |
| Ânodo do D1 (pino ADJ) para GND | 3,10 V | 2,7 a 3,4 V | LED invertido ou queimado |
| Sobre R1 + RV1 (entre OUT e ADJ) | 1,25 V | 1,2 a 1,3 V | LM317 falso ou fora de regulação |
| Corrente com RV1 no mínimo (0 Ω) | 18,4 mA | 17,0 a 19,4 mA | R1 errado ou cursor do RV1 sem ligação |
| Corrente com RV1 no máximo (220 Ω) | 4,3 mA | 3,5 a 5,5 mA | reostato maior que 220 Ω: o LM317 pode oscilar |

## 6. Impressão
Material PLA, camada de 0,2 mm, 3 perímetros, enchimento de 20 a 30 %.

| Peça | Orientação | Suportes |
|---|---|---|
| Abraçadeira | arquivo `-impressao` (abre para cima) | não |
| Suporte base + coluna | arquivo `-impressao` (deitado nas costas) | sim, dentro da caixa (teto da caixa em ponte de 85 mm) |
| Tampa de fundo | já plana | não |
| Difusor | plano, em PLA natural ou branco, ⌀ 26 × 0,8 mm (4 camadas de 0,2 mm) | não |

Cor escura nas paredes ajuda a evitar luz espalhada. Imprima na ordem do roteiro (seção 9).

## 7. Montagem
A ordem é a do manual de construção (os mesmos passos, com as imagens e o detalhe de cada solda), em cinco fases, na ordem da bancada: primeiro a eletrônica, depois a caixa, por fim o pregoscópio. O manual da v1 tem 14 passos e o da v2, 15; a lista abaixo agrupa os passos por fase.

**Fase 1: parte elétrica e placa**
1. Solde na placa PCB1 (**v1:** 40 × 25 mm; **v2:** 70 × 25 mm), dos componentes mais baixos para os mais altos: R1 (68 Ω), **v2:** o diodo D2 (faixa para o lado do pad pin2), C1 (100 nF) e por último o U1, com o rótulo para a frente (ADJ, OUT, IN da esquerda para a direita) e a aleta para trás. Cada solda deve ficar brilhante, em cone. Com o multímetro em continuidade, confirme que não há curto entre IN e GND nem entre OUT e GND.
2. Fixe a placa na tampa M3, nos 4 suportes de 6 mm, com 4 parafusos M3 × 8 (H3), em cruz e sem forçar. A seta FRENTE / FRONT da placa aponta para o lado do interruptor, que será a frente da caixa.
3. **v1:** encaixe a pilha de 9 V no berço da tampa, solde o fio vermelho do clipe no pad BT1 POS e o preto no BT1 NEG, e só então encaixe o clipe na pilha.

**Fase 2: componentes de iluminação**
4. Solde os dois fios do LED (laranja na perna longa, o ânodo; preto na curta, o cátodo), com menos de 3 segundos por perna, isole as emendas com o termorretrátil (W2) e encaixe o LED no porta-LED da tampa, com o flange na sede. Os fios descem pelo furo do porta-LED e saem pela **fenda lateral**, voltada para a placa (a tampa não tem furo para fora).
5. Ligue o LED à placa: fio laranja no pad D1 ANODO, preto no D1 CATODO. Puxe cada fio de leve, afaste-os da aleta do U1 e prenda os soltos com um ponto de cola quente.

**Fase 3: suporte (a caixa)**
6. Retire os suportes de impressão da caixa M1 e limpe todos os furos com uma broca de 3 mm. Passe lixa fina nas bordas do canal da lâmina e confira que não ficou resto dentro da caixa.
7. Com a caixa de cabeça para baixo, cole o difusor (⌀ 26 × 0,8 mm) no encaixe do teto, por dentro, com um cordão fino de cola quente (W3) na borda, sem cobrir a janela de ⌀ 24 mm.
8. Prove a lâmina (76 × 26 × 1 mm) no canal: ela deve entrar e sair sem esforço e sem folga lateral visível. Se prender, use o gabarito G2.
9. Instale o interruptor KCD1-101, de fora para dentro, no recorte de 21,2 × 15,0 mm da parede frontal, até as travas estalarem.
10. **v2:** instale o conector DC-022B no furo de ⌀ 7,8 mm da parede direita (porca por fora, terminais para dentro).
11. **v2:** instale o reostato no furo de ⌀ 7,5 mm da frente, com a porca por fora, e encaixe o botão.

**Fase 4: ligação, teste e fechamento**
12. Ligue os fios do painel aos pads, nas cores da lista de ligações, e deixe folga para a tampa abrir. **v1:** interruptor SW1 (vermelho no terminal 1 e no pad SW1 A, laranja no terminal 2 e no pad SW1 B). **v2:** conector J1 (vermelho no pad J1 VIN, preto no J1 GND), interruptor SW1 (A e B) e os três terminais do reostato RV1 (amarelo, verde e azul nos pads pin1, pin2 e pin3). Isole as soldas com termorretrátil.
13. Faça o plano de teste da seção 5 antes de fechar, na ordem da tabela. Todas as leituras devem ficar na faixa, e o LED deve acender.
14. Feche a tampa com 4 parafusos M3 × 10, apertando aos poucos e em cruz. Cuide para não prender fio.

**Fase 5: posicionar o pregoscópio**
15. Encaixe o pregoscópio no anel da coluna: tire a metade da abraçadeira, encoste o tubo externo de lado, recoloque e aperte os 2 parafusos M3 × 16 sem forçar.
16. Foco: **v2:** ligue a fonte de 12 V ao conector e o interruptor, e gire o botão do reostato para o brilho. Afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno, até a lâmina ficar nítida. Foco nominal: lente a 0,8 mm da lâmina, com o tubo interno estendido 37 mm (leia a escala impressa no tubo). A ponta da objetiva tem mola, mas não force contra o vidro.

**Cuidados** (os mesmos avisos do manual)
- Ferro de soldar a 300 °C: apoie-o no suporte, solde em local ventilado e com menos de 3 segundos por perna do LED.
- A cola quente queima: use a ponta do bastão e deixe esfriar 1 minuto.
- Confira a polaridade antes de ligar: LED (perna longa +), diodo (faixa = cátodo), plugue de centro positivo.
- Não aperte demais os parafusos: o PLA racha. Pare quando o parafuso encostar.

## 8. O que ainda não foi verificado
- **Nada foi impresso nem montado.** Todas as folgas (0,2 mm no furo do tubo, 0,6 mm de abertura da abraçadeira, 0,4 mm no difusor e no LED) são valores típicos de FDM.
- Medidas ainda por conferir: lâmina real, furo do interruptor e do conector, diâmetro do tubo externo com mais de um ponto de medição, quanto a objetiva sai do tubo.
- Distância de trabalho de 0,8 mm é um valor típico de objetiva 40x/0,65; confirme com a sua.
- O LED a cerca de 10 mm da janela pode iluminar de forma irregular; o difusor deve resolver, mas só o teste confirma.
- Os Gerbers passaram numa checagem independente (`scripts/verificar-gerber.py`, com gerbonara): contorno, furos dentro da placa, furos de montagem nos lugares dos suportes e cobre a mais de 3 mm da borda. Em 23/11/2026 a placa v2 também foi desenhada a partir dos Gerbers (`scripts/renderizar-gerber.py`), e a conferência de ligações (`scripts/verificar-rede-gerber.py`) confirmou que o cobre liga exatamente as pastilhas do circuito, sem aberto nem curto (v1: 13 pastilhas e 5 redes; v2: 18 pastilhas e 7 redes). A via da v2 foi aumentada para 0,3 mm de furo. Continuam sem verificação a largura mínima de trilha (0,15 mm) e a folga mínima (0,16 mm), que dependem da fábrica: pergunte o mínimo dela antes de pedir.
- O circuito foi calculado e simulado no simulador (corrente contínua, fonte ideal, LED por limiar), mas **não foi medido com multímetro**. O plano de teste da seção 5 serve para isso.
- Os valores de interruptor, conector e reostato vêm de guias e anúncios, não de datasheet oficial.

## 9. Roteiro de teste
1. Imprimir os gabaritos G1 a G3 e provar as peças reais; atualizar `holder.ts` (ver `CALIBRACAO.md`).
2. Imprimir só a abraçadeira e provar no tubo. Ajustar `boreClearance` e `clampGap` se estiver folgada ou apertada.
3. Imprimir a tampa de fundo e provar no LED, na placa e na pilha.
4. Montar o circuito fora da caixa e fazer o plano de teste da seção 5.
5. Imprimir o suporte completo, montar e conferir altura e foco com a lâmina.
6. Registrar os ajustes em `holder.ts` e regenerar com `npx tsx scripts/build-suporte.ts`.

## 10. Versão 1000x econômica (só v2)
Mesma caixa, coluna e fonte da v2, com as peças a mais para a objetiva de imersão. O manual próprio (`MANUAL-v2-1000x-pt.pdf`) traz os 11 passos com imagens; aqui estão as diferenças e a ordem. Os números marcados "suposto" em `packages/adapter-cad/src/suporte-1000x.ts` vêm de anúncios e precisam ser medidos nas peças compradas.

### O que muda em relação à v2 de 400x
| Item | 400x (v2) | 1000x |
|---|---|---|
| Objetiva | 40x/0,65 seca | 100x/1,25 de imersão em óleo, ponta com mola (comprimento e distância de trabalho supostos: parafocal de 45 mm menos 0,18 mm) |
| Ocular | do cliente | WF10X, do cliente, na borda do tubo externo |
| Amostra | lâmina | lâmina com lamínula de 22 × 22 × 0,17 mm e uma gota de óleo de imersão de cerca de 5 mm |
| Luz | LED 5 mm, 4,3 a 18,4 mA, reostato RV1 | LED branco frio de 3 W em estrela de alumínio, a 350 mA, sobre um dissipador redondo HS1 com pasta térmica TP1 |
| Driver | LM317 + R1 na PCB1 (Gerber) | módulo driver de corrente constante de 350 mA (DR1), colado numa placa ilhada de 40 × 25 mm (PCB1); **não há Gerber** |
| Brilho e contraste | reostato | roda de aberturas AP1, com furos de 24, 10, 2, 5 e 16 mm |
| Peças impressas a mais | só M1 a M4 | tubo de luz M5 (preto, em pé) e roda AP1; tampa M3 com 12 furos de ventilação; abraçadeira M2 mais alta |
| Altura com o pregoscópio | 228,2 mm | 237,6 mm |

### Fiação: cinco fios de 24 AWG (F1 a F5)
| Fio | Cor | De | Para |
|---|---|---|---|
| F1 | vermelho | cátodo do D2 (lado da faixa) | terminal 1 da chave SW1 |
| F2 | laranja | terminal 2 da chave SW1 | entrada IN+ do driver |
| F3 | preto | terminal − do J1 | entrada IN− do driver |
| F4 | amarelo | saída LED+ do driver | pad + da estrela do LED |
| F5 | azul | saída LED− do driver | pad − da estrela do LED |

O ânodo do D2 (lado sem faixa) vai direto ao terminal + do J1. O J1 fica na parede direita, atrás do tubo de luz (y = 32 mm), para as orelhas do conector não encostarem no tubo. Os comprimentos de corte estão na lista de corte do manual.

### Impressão
PLA, camada de 0,2 mm, 3 perímetros, enchimento de 20 a 30 %. **Mesa com mais de 240 mm no lado maior** (a coluna deitada tem 237,6 mm).

| Peça | Orientação | Suportes |
|---|---|---|
| M1 suporte + coluna | arquivo `-impressao` (deitado nas costas) | sim, só dentro da caixa e na fenda da roda |
| M2 abraçadeira | arquivo `-impressao` (abre para cima) | não |
| M3 tampa de fundo | já plana | não |
| M4 difusor | plano, PLA natural ou branco, 4 camadas de 0,2 mm (0,8 mm) | não |
| M5 tubo de luz | em pé, **PLA preto**, a fenda do pé voltada para o lado; o pino do topo é fino: imprima devagar | não |
| AP1 roda de aberturas | arquivo `-impressao` (deitada), **enchimento de 100 %** | não |

### Montagem (a ordem do manual de 11 passos, em cinco fases)
**Fase 1: parte elétrica e placa**
1. Cole o driver DR1 no centro da placa ilhada PCB1 (40 × 25 mm), com as entradas (IN+, IN−) para a esquerda e as saídas (LED+, LED−) para a direita. Não solde nada na placa: ela só serve de apoio.
2. Aparafuse a placa nos 4 suportes de 6 mm da tampa M3 com 4 parafusos M3 × 8 (H3), atrás do círculo central onde ficará o tubo de luz. O driver não pode encostar nesse círculo.

**Fase 2: componentes de iluminação**
3. Cole o dissipador HS1 com cola quente no centro da tampa. Passe pasta térmica (TP1) na parte de baixo da estrela do LED e assente-a no dissipador, com os pads para a frente. Ponha o tubo de luz M5 em volta, com a fenda do pé voltada para a coluna, e cole a base. Não tape os 12 furos de ventilação. **Nunca ligue o LED sem o dissipador.**

**Fase 3: suporte (a caixa)**
4. Limpe os furos da caixa M1 com uma broca de 3 mm, tire os suportes de impressão e vire a caixa de cabeça para baixo. Encaixe a chave SW1 e o conector J1 (parede direita, atrás do tubo de luz, y = 32 mm, porca por fora) e solde o ânodo do diodo D2 (lado sem faixa) ao terminal + do J1, com o corpo do D2 no ar e a faixa para o lado livre.
5. Ainda com a caixa de cabeça para baixo, cole o difusor M4 no encaixe do teto, por dentro, com um cordão de cola quente (W3) na borda, sem cobrir a janela.

**Fase 4: ligação, teste e fechamento**
6. Corte os 5 fios, descasque 6 mm de cada ponta e solde F1 a F5 como na tabela acima, protegendo as emendas com termorretrátil (W2). Deixe folga nos fios F1 a F3. Nenhum fio pode tocar o dissipador.
7. Teste na bancada, com a tampa aberta (tabela abaixo). Deixe o LED aceso por 30 minutos e meça o dissipador.
8. Feche a tampa com 4 parafusos M3 × 10, em cruz, deixando folga nos fios F1 a F3.
9. Com a tampa fechada, entre com a roda AP1 de lado pela fenda da parede direita, até o furo central cair no pino do tubo de luz. Cada um dos 5 furos deve parar no eixo da janela, e a borda deve sair cerca de 13 mm da caixa.

**Fase 5: posicionar o pregoscópio**
10. Rosqueie a objetiva 100x no tubo interno, encaixe o tubo externo no anel e feche a abraçadeira com 2 parafusos M3 × 16. Coloque o ocular WF10X e ligue a fonte de 12 V ao J1.
11. Cubra a amostra com a lamínula, deslize a lâmina no canal e ponha uma gota de óleo sobre a lamínula. Com a roda em 24 mm, estenda o tubo interno até 37 mm na escala e desça devagar até o óleo tocar a objetiva. Foque girando o tubo, sem forçar a ponta com mola, e só então feche a abertura da roda para ajustar brilho e contraste.

### Teste elétrico com o multímetro
| Ponto | Esperado | Faixa | Se estiver fora |
|---|---|---|---|
| Fonte no J1: + para −, sem carga | 12,0 V | 11,5 a 15,0 V | fonte fraca ou sem regulação: troque a fonte |
| Cátodo do D2 para GND, chave aberta | leitura 1 − 0,1 a 0,6 V | 11,0 a 12,3 V | 0 V: D2 ao contrário ou solda fria no J1 |
| IN+ do driver para GND, chave ligada | igual à leitura 2 (± 0,2 V) | 10,8 a 12,3 V | chave sem contato ou solda fria em F1 e F2 |
| Tensão sobre o LED (LED+ para LED−) | 3,2 V | 3,0 a 3,6 V | 0 V ou igual à entrada: LED invertido ou aberto |
| Corrente do LED, multímetro em série na entrada de 10 A | 350 mA | 330 a 370 mA | acima de 370 mA: driver de 700 mA ou mal ajustado, desligue |
| Dissipador depois de 30 minutos, tampa fechada | até 50 °C | até 50 °C | acima de 55 °C o PLA amolece: reduza a corrente, ventile ou use PETG |

O driver não tem proteção contra polaridade invertida: confira o D2, o LED e o plugue antes de ligar. Use só a fonte de 12 V indicada. O dissipador e o driver esquentam. Siga a ficha do óleo de imersão e limpe a objetiva e a lamínula com papel de lente e álcool isopropílico depois de cada uso.

### O que ainda não foi verificado na 1000x
- **Nada foi impresso, montado nem medido.**
- Tamanhos supostos: a objetiva 100x (comprimento sob o ombro, parafocal de 45 mm, distância de trabalho de 0,18 mm), a estrela do LED (⌀ 20 mm), o dissipador (⌀ 30 × 12 mm) e o driver (30 × 20 × 10 mm). O driver achado (K2679) é de 700 mA e não tem o tamanho publicado: meça o módulo que comprar.
- A temperatura de até 50 °C e a uniformidade da luz sobre a janela são estimativas; só o teste com o LED aceso confirma.
- A roda de aberturas gira sem trava: a posição de cada furo no eixo é conferida a olho.
- Não há gabaritos de calibração para as peças da 1000x (a série de `CALIBRACAO.md` cobre só a 400x).
