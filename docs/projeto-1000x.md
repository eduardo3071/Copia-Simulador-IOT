# Projeto 1000x (objetiva 100x/1,25 em óleo + ocular WF10X)

Estado em 2026-11-08: **a etapa 1 (estudo, modelo e painel no site) está pronta; a etapa 2 (projeto mecânico e elétrico) não foi feita** porque depende de três medidas que só existem com as peças na mão (seção 5).

Isto é engenharia do instrumento. Nada aqui o torna um equipamento de diagnóstico: para malária, a OMS publica 13 procedimentos numerados (18 documentos, contando as letras a, b e c) e o de exame é o SOP 08, e um laboratório segue esses protocolos com treino e controle de qualidade.

## 1. O que 1000x exige

| Peça | Hoje (400x) | Para 1000x |
|---|---|---|
| Objetiva | 40x/0,65, a seco | **100x/1,25 em óleo**, 160/0,17, rosca RMS, ponta com mola |
| Ocular | WF10X, ⌀ 23,2 mm | o mesmo |
| Aumento total | 400x (≈ 335x com o tubo curto) | 1000x, dentro da faixa útil de 625x a 1250x (500 a 1000 vezes a abertura) |
| Iluminação | LED de 5 mm difuso, ≈ 1 lm, ≈ 600 cd/m² no disco | condensador com diafragma + LED de 1 a 3 W |
| Óleo | não usa | óleo de imersão entre a lâmina e a objetiva |
| Tubo | 152 mm (ideal 160 mm) | perto de 160 mm: com 0,65 de abertura a diferença já aparece, com 1,25 aparece mais |

Resolução teórica (1,22 × 0,55 µm ÷ (NA da objetiva + NA da iluminação)):

- 40x/0,65 com condensador igual: 0,52 µm.
- 100x/1,25 com condensador com óleo: 0,27 µm.
- 100x/1,25 com um difusor (NA geométrica ≈ 0,9): 0,31 µm. A diferença é pequena; o que o difusor não dá é **brilho**.

Campo visto a 1000x: 18 mm ÷ 100 = 0,18 mm. Um anel de parasita de 1,4 µm aparece com ≈ 1,3 mm na imagem; uma hemácia de 7 µm, com ≈ 6,7 mm.

## 2. Altura: por que o suporte não serve do jeito que está

O topo do tubo tem de ficar `L` acima do ombro da objetiva, e o ombro fica `comprimento sob o ombro + distância de trabalho` acima da lâmina.

- Hoje: topo do tubo 187,8 mm acima da lâmina; 35 mm sob o ombro (medido na 40x) + 0,8 mm; **L = 152 mm**.
- Objetivas 100x de família padrão têm **45 mm de distância parfocal** (Bresser, Optika). A 40x comprada tem 35 mm, ou seja, **não é a família de 45 mm**. Uma 100x de 45 mm é ≈ 10 mm mais comprida e deixaria o tubo com ≈ 142 mm.
- Para L = 160 mm com uma de 45 mm e 0,18 mm de trabalho: topo do tubo a **205,2 mm** da lâmina, ou seja, 17,4 mm mais alto que hoje.
- Limite do pregoscópio: o tubo interno sai 40 mm, então L máximo = 115 + 40 = **155 mm**. Chegar a 160 mm pede um extensor de pelo menos 5 mm entre o tubo externo e o ocular (e mais, para sobrar curso de foco).

Moral: **meça a 100x antes de fabricar a cabeça nova.** Os parâmetros do suporte que mudam são `objectiveLength`, `workingDistance` e `innerPull` (em `holder.ts`).

## 3. Iluminação

Sem condensador, o brilho da imagem em campo claro é da ordem da luminância do difusor vezes a transmissão da objetiva (uma 100x de óleo tem muitas lentes). O disco de 26 mm com um LED de 5 mm (≈ 1 lm, calculado de 1.200 mcd a 60°) dá ≈ 600 cd/m², que é pouco.

Caminho recomendado:

1. **Condensador de Abbe NA 1,25 com diafragma de íris**, com a lente de cima a 1 mm ou menos sob a lâmina. As montagens variam (cauda de andorinha ou anel redondo) e os tamanhos não vêm padronizados nos anúncios: **meça o condensador comprado** (diâmetro externo, altura, diâmetro da lente de cima).
2. **LED branco de 1 a 3 W** sob o condensador, em dissipador.
3. **Driver de corrente constante pronto** (350 mA para 1 W, 700 mA para 3 W) em vez do LM317. Motivo: com a fonte de 12 V, o LM317 dissiparia ≈ 2,5 W a 350 mA ((12 − 0,4 − 3,3 − 1,25) V × 0,35 A) e ≈ 5 W a 700 mA, o que pede dissipador grande. O reostato deixa de controlar o brilho: dimerização precisa de um driver com entrada de controle.
4. Na v1, com bateria de 9 V, um LED de 1 W esgota a bateria em cerca de 1 hora: **a v1 não serve para 1000x**.

O LED de potência, o condensador e o óleo exigem rever a caixa: o espaço de 37,6 mm de cavidade comporta o condensador e o LED, mas a janela do LED, o assento do difusor e o canal da lâmina mudam, e o óleo precisa de um anel contra gotas para não escorrer para dentro da caixa.

## 4. Lista de compras do 1000x (a precificar)

- Objetiva 100x/1,25 óleo, 160/0,17, RMS, ponta com mola (distância de trabalho típica 0,13 a 0,18 mm).
- Condensador de Abbe 1,25 com íris.
- LED 1 a 3 W branco (6000 K), estrela com dissipador, e driver de corrente constante de 350 ou 700 mA.
- Óleo de imersão para microscopia e papel para lente.
- Extensor impresso do tubo (se L < 155 mm).

## 5. O que falta para fechar a etapa 2

1. **Medida da 100x**: distância do ombro da rosca RMS até a ponta, e a distância de trabalho do modelo escolhido.
2. **Medida do condensador**: diâmetro externo, altura total, diâmetro da lente de cima e o tipo de montagem.
3. **Escolha do driver/LED**: potência (1 ou 3 W) e se haverá controle de brilho.

Com isso: parâmetros novos do suporte, peça do condensador (M5), suporte do LED com dissipador, anel contra óleo, novos desenhos, 3D, manual, plano de teste elétrico e custos. Eu não inventei esses valores.

## Fontes

- 100x/1,25 óleo: Motic EA (0,06 mm), Motic ASC (0,14 mm), Motic SP (0,165 mm), Optika M-1123.N (0,13 mm, 45 mm parfocal), Optika/Micro-Pro (0,18 mm, 45 mm), Bresser (160 mm, 0,17 mm, 45 mm), Zeiss A-Plan (0,22 mm, rosca M27).
- Condensadores: Meiji, Accu-Scope, Kern e Olympus; as dimensões em milímetros não aparecem de forma comparável nos anúncios.
- Lista de SOPs: página da OMS de microscopia de malária.

## 6. Guia de compra (2026-11-08)

Ordem: compre **primeiro a objetiva**, porque ela define a altura do suporte; depois o condensador.

**Objetiva 100x/1,25 em óleo.** Procure "100x/1.25 oil, 160/0.17, RMS, spring". Evite: "∞" (infinito), "185", rosca M27 (Zeiss) e "sem mola". Pergunte ao vendedor, com foto ao lado de uma régua: (1) comprimento do ombro da rosca até a ponta e a distância parfocal (o ideal é 45 mm); (2) distância de trabalho. Achados: anúncios no eBay em dólar (de US$ 55 a US$ 180, quase todos usados) e um anúncio da categoria "objetiva acromática 100x imersão em óleo" no Mercado Livre; nenhum preço em reais foi conferido.

**Condensador de Abbe NA 1,25 com diafragma de íris.** Há conjuntos genéricos no AliExpress e no eBay (um deles anuncia "37 mm" e fixação por 3 parafusos). O tamanho não vem padronizado: peça diâmetro externo do corpo, altura total, diâmetro da lente de cima e o tipo de montagem, e dê preferência a um corpo cilíndrico (cabe num anel impresso).

**LED e driver.** LED de 3 W branco (6000 K) em estrela de alumínio, 700 mA, tensão direta de 3,0 a 3,6 V, com dissipador de alumínio e pasta térmica; driver de corrente constante de 700 mA para entrada de 12 V. Não ligue o LED direto na fonte nem com resistor: um anúncio avisa que o resistor em série dissiparia potência demais. O LED de potência precisa de dissipador sempre.

**Óleo de imersão.** Frasco de 100 ml (há anúncio da Laborclin no Mercado Livre). Confira com o vendedor o índice de refração, que no Zeiss Immersol 518 F é 1,518 (a 23 ou a 30 °C, conforme a fonte: confira o certificado do lote). Um anúncio descreve o óleo como à base de rícino: peça o certificado antes de aceitar. Compre também papel para lente.

**Mensagem para o vendedor (inglês, para AliExpress/eBay):**
"Please send a photo with a ruler and tell me: (1) the length from the RMS shoulder (the face the thread screws against) to the front tip, and the parfocal distance; (2) the working distance; (3) for the condenser: outer body diameter, total height, top lens diameter and mount type."


A pesquisa detalhada de cada material, com modelos, links e o que medir, está em `docs/materiais-1000x.md`.

## 7. Dá para chegar a 1000x sem o condensador? (cálculo de 2026-11-08, ainda não testado)

O que **não** tem substituto: a objetiva 100x/1,25 em óleo. Sem ela, a resolução teórica fica em 0,43 a 0,52 µm (40x/0,65) contra 0,27 a 0,31 µm, e ampliar mais (digitalmente ou com ocular de 20x) só deixa a imagem maior, não mais nítida.

O que **pode** ser dispensado, em teoria:

- **Condensador seco:** uma iluminação por difusor logo sob a lâmina tem abertura geométrica de ≈ 0,91 (disco de 26 mm a 6 mm da lâmina, valor assumido). A resolução da 100x fica em 0,311 µm com o difusor e em 0,312 µm com um condensador seco de 0,9: **o mesmo**. Só um condensador de 1,25 com óleo sobre a lente de cima chega a 0,268 µm, e isso exige óleo nos dois lados.
- **Brilho:** o condensador também serviria para concentrar luz, mas com um LED de 3 W (240 a 300 lm) espalhado no disco de 26 mm o brilho vai a ≈ 144.000 a 180.000 cd/m², contra ≈ 600 cd/m² do LED de 5 mm. A luz deixa de ser o problema.
- **O que se perde sem condensador:** o diafragma de abertura, que controla contraste e reflexos. Um diafragma de íris de 1,5 a 25 mm (há no eBay) sob o difusor devolve parte disso. Sem alinhamento de Köhler, o contraste fica menor; isso não foi medido.

Resultado: uma versão econômica seria **objetiva 100x/1,25 em óleo + LED de 3 W com driver de 700 mA e dimerização + difusor + íris**, sem o condensador (≈ R$ 165 a R$ 200 a menos). É uma conclusão de cálculo: só o teste com a lâmina mostra se o contraste serve.

Alternativa sem óleo: objetiva 60x/0,85 a seco, 600x no total (faixa útil de 425x a 850x), resolução teórica de 0,40 µm. Não pesquisei preço.

## 8. A versão econômica no 3D (2026-11-08)

Abra a aba 3D, v2, e clique em **1000x econômico**. A cena troca a cabeça do suporte (237,6 mm de altura, contra 228,2 mm), a objetiva (100x de 44,8 mm sob o ombro), e põe sob o difusor o conjunto de iluminação. A tabela ao lado dá as dimensões de cada peça e diz de onde vieram.

Decisões de projeto e por quê:

- **Altura:** o tubo fica com 152 mm (115 do tubo externo + 37 de extensão), como na 400x. Com uma 100x de 45 mm de parafocal e 0,18 mm de trabalho, a cabeça sobe 9,4 mm; o tubo interno trabalha em 37 mm e sobram 3 mm de curso para o foco.
- **Distância de trabalho:** a lente fica a 0,18 mm da lamínula, que fica 0,17 mm acima da lâmina; a gota de óleo ocupa esse espaço.
- **LED de 3 W a 350 mA, não 700 mA:** a caixa é de PLA, que amolece perto de 60 °C, e o dissipador fica dentro dela. A 350 mA o LED consome ≈ 1,2 W e deixa ≈ 0,7 a 1,0 W de calor (estimativa: um LED branco converte 20 a 40 % da potência em luz). O brilho cai pela metade e continua mais de 100 vezes acima do LED de 5 mm. Isso muda o driver: precisa de 350 mA, não do K2679 de 700 mA. **Não verifiquei a temperatura real**: confirme na bancada, com o LED aceso por 30 minutos.
- **Ventilação:** a tampa ganha 12 furos de 3,4 mm em volta do dissipador. A caixa continua sem aberturas na parede.
- **Tubo de luz (M5, impresso em preto):** ⌀ 48,4 mm por fora, 44,4 mm por dentro e 37,6 mm de altura, apoiado na tampa até o teto. Segura a íris contra um anel de 1,5 mm sob o difusor e impede a luz de espalhar. A íris é empurrada por baixo; falta definir como prendê-la (cola quente ou 3 pontos de cola).
- **Sem reostato nem LM317:** o brilho para a câmera se ajusta pela íris, não por um reostato. A placa de 40 × 25 mm leva só o driver e o diodo D2.
- **Distância do LED à íris:** 13,3 mm, acima do mínimo de 10 mm que o projeto exige para a luz cobrir o difusor.

Verificado por teste (238 passam): o layout não tem erros; o tubo do pregoscópio com a 100x não encosta em nenhuma peça impressa; o tubo de luz cabe na caixa e deixa a placa do driver atrás; os 12 furos ficam entre o dissipador e a parede do tubo; a v1 e a v2 continuam iguais.

**O que ainda é suposição** (medir nas peças compradas): objetiva (diâmetro e comprimento), íris, estrela do LED, dissipador e driver. O 3D marca cada uma como "suposto". **Não está feito:** os fios, o ocular no 3D, o manual, a lista de compras e o plano de teste elétrico desta versão.

STLs em `pacote-montagem/mecanica/v2-1000x/`: base e coluna, tampa, abraçadeira, tubo de luz.

## 9. Custo da versão econômica (2026-11-08, preços do Brasil, sem o pregoscópio)

Painel "Custo do suporte e da eletrônica", na aba Eletrônica da v2, botão **v2 · 1000x econômico**; planilhas `pacote-montagem/CUSTOS-v2-1000x-1un.csv` e `CUSTOS-v2-1000x-100un.csv`.

| | v2 · 400x | v2 · 1000x econômico |
|---|---|---|
| Só o que é usado, por unidade | R$ 87,79 | **R$ 218,08** |
| Gasto para comprar tudo (1 protótipo) | R$ 215,97 | **R$ 337,05** |
| Lote de 100, por unidade (pacotes inteiros, varejo) | R$ 87,80 | R$ 218,48 |

Maiores itens da 1000x: objetiva 100x R$ 86,68 (anúncio genérico; de R$ 66 a R$ 87), óleo R$ 47,38 (1 frasco de 100 ml por instrumento), filamento ≈ R$ 43 (357 g), fonte R$ 26,11, LED de 3 W R$ 4,17.

**Fora do total, por falta de preço:** dissipador, driver de 350 mA, íris, lamínulas de 0,17 mm e o fio de 24 AWG. O custo real fica acima do mostrado. O frasco de óleo por instrumento é uma escolha conservadora: um frasco serve a muitos instrumentos.
