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
