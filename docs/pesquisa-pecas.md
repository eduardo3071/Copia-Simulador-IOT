# Pesquisa das peças reais (2026-11-05)

Resumo do que foi encontrado para cada peça e de onde veio. Valores marcados como **não confirmado** não apareceram em nenhuma fonte e continuam sendo estimativa do projeto.

## Objetiva 40x/0,65 e ocular WF10X: o comprimento do tubo

| Item | Valor | Fonte |
|---|---|---|
| "160/0,17" na objetiva | calculada para tubo de 160 mm e lamínula de 0,17 mm | [OpenFlexure](https://openflexure.discourse.group/t/which-optics-part-for-my-old-microscope-objective/1278) |
| Comprimento mecânico do tubo | 160 mm, do ombro da objetiva ao ombro do ocular | [Nikon](https://www.microscope.healthcare.nikon.com/resources/glossary/mechanical-tube-length), ISO 9345-1 |
| Imagem intermediária | 10 mm abaixo do ombro do ocular (DIN 58887; regra antiga da Leitz: 13 mm) | [Microscopy UK](https://www.microscopy-uk.org.uk/mag/artnov15/The%20Mechanical%20Tube%20Length%20Version%201.pdf) |
| Rosca | RMS 0,8 pol × 36 fios/pol | [MKS ValuMax](https://np.p1.mks.com/p/MVC-40X) |
| Distância parfocal | 45 mm é o padrão; objetivas baratas "185" têm 35 mm | OpenFlexure. **A objetiva comprada tem 35 mm abaixo do ombro, então a parfocal dela provavelmente é ≈ 35 mm: não confirmado** |
| Distância de trabalho 40x/0,65 | 0,38 mm (MKS), 0,4 mm (Motic), 0,45 mm (Zeiss), 0,53 mm (Kern) | páginas dos fabricantes |
| Ocular WF10X | canudo ⌀ 23,2 mm, campo 18 mm (Bresser, Kern), olho a 13 mm (Vixen) | [Bresser](https://masterfoto.lv/en/microscopes/47149-bresser-din-wide-field-eyepiece-wf10x.html) |

### O que isso muda no pregoscópio

- Tubo externo de 115 mm + tubo interno que sai de 0 a 40 mm: o comprimento mecânico vai de **115 a 155 mm**. Os 160 mm **nunca são atingidos**.
- Na posição de trabalho de hoje (lente a 0,8 mm da lâmina, tubo interno 19 mm para fora) o comprimento é **134 mm**, 26 mm abaixo do projetado.
- O canudo do ocular tem 23,2 mm e o tubo interno tem 22,5 mm: **o ocular só pode entrar no tubo externo**.
- A imagem intermediária tem ⌀ 18 mm: nenhum diâmetro interno do caminho óptico pode ficar abaixo disso.
- Consequência óptica: com 134 mm a imagem fica um pouco mais mole (aberração esférica, mais sentida em 0,65 de abertura) e o aumento total cai para cerca de 335x em vez de 400x (estimativa proporcional).

Opções para chegar perto de 160 mm (decisão do projeto, ainda não aplicada):

1. Subir a cabeça do suporte (mais coluna) para o tubo interno trabalhar mais estendido (≈ 36 mm). Mexe nas peças impressas.
2. Colocar um tubo-extensor de ≈ 20 a 25 mm entre a borda do tubo externo e o ocular. Não mexe no suporte, mas depende de como o ocular se liga ao pregoscópio.
3. Aceitar os 134 mm.

## Peças elétricas

| Peça | Valor usado no teste simulado | Fonte |
|---|---|---|
| LM317, referência | 1,2 a 1,3 V (típico 1,25 V) | [ON Semi](https://www.onsemi.com/download/data-sheet/pdf/lm317-d.pdf) |
| LM317, corrente do pino ADJ | 50 µA típico, 100 µA máximo | idem |
| LM317, carga mínima | 3,5 mA típico; máximo garantido **5 mA** (ST) ou **10 mA** (TI), conforme o fabricante | datasheets ST e TI |
| LM317, queda de tensão mínima | 2 V usado no projeto; as fontes variam de 1,2 V (a 1,2 A) a 3 V (guia de projeto). **Não confirmado a 20 mA** | idem |
| LED branco 5 mm | 2,8 a 3,4 V a 20 mA | [Lumimax LED5WHI](https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/6283/LED5WHI.pdf), Wah Wang |
| 1N5819 | 0,4 V usado com folga. A queda a 20 mA depende da curva do datasheet (≈ 0,45 V máximo a 1 A). **Valor a 20 mA não confirmado** | [ST](https://manualmachine.com/st/1n5817/8333147-user-manual) |
| Pilha 9 V alcalina | impedância de 3 a 4 Ω a 1 kHz (Duracell, Ansmann) | [Duracell](https://www.ee.columbia.edu/sites/default/files/content/docs/Duracell%209V%20battery.pdf) |
| Capacidade a 25 mA | **não confirmado**: os datasheets achados medem a 620 Ω (≈ 9 mA) | idem |
| Reostato WH148 | eixo 6 mm, rosca M7 | [Sigmanortec](https://sigmanortec.ro/en/rotary-potentiometer-wh148-15-mm-5k). Tolerância de ±20 % é a usual, **não confirmada** para o seu |
| Conector DC-022B | 5,5 × 2,1 mm; furo de painel 7,8 mm na maioria dos anúncios (um diz 13 mm) | [Sigmanortec](https://sigmanortec.ro/en/panel-female-jack-55x21mm-dc-022b), [Temperosystems](https://temperosystems.com.au/?p=16801) |
| Interruptor KCD1-101 | recorte 21,2 × 15,0 mm | [LCSC](https://www.lcsc.com/blog/kcd1-switches-rocker-switches-guide/) |
| Lâmina | 76 × 26 mm, 1 mm (ISO 8037/1; Marienfeld ±0,05 mm) | [Epredia](https://www.labfriend.com.au/epredia-superfrost-ot-microscope-slides-76x26mm-10mm-cut-edges-white-pack-of-50) |

### O que o simulador mostrou (e mudou)

- A faixa de leitura da saída do U1 (4,1 a 4,6 V) falhava com peças dentro da tolerância: 15 % dos LEDs e referências sorteados saíam dela. Passou a 3,9 a 4,8 V.
- A faixa da corrente com o reostato no máximo (3,9 a 4,8 mA) falhava em 24 % dos sorteios por causa dos ±20 % do reostato. Passou a 3,5 a 5,5 mA.
- A dica do ânodo do LED estava errada: um LED invertido ou aberto lê **quase a mesma tensão da saída**, não 0 V. Corrigida.
- **Risco real**: o piso de 4,4 mA com o reostato no máximo está acima da carga mínima típica do LM317 (3,5 mA), mas abaixo da máxima garantida (5 a 10 mA). Se o brilho mínimo oscilar, troque o reostato por 100 a 150 Ω.
- Fonte de 12 V sem regulação lê até 14 V vazia: o ponto 2 do teste passa a ser julgado contra a leitura da fonte, não contra 12 V fixos.
