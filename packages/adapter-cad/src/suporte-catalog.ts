/**
 * Every part of the pregoscopio support, with a stable identifier, the reason it was chosen and how well
 * its numbers are known. The Suporte page lists them; the identifiers match the 3D labels and the schematics.
 */

export type SuporteVersion = "v1" | "v2";
export type PartKind = "impressa" | "comprada" | "referencia" | "calibracao";
/** How far the numbers of a part can be trusted. */
export type Evidence = "calculado" | "medido" | "padrao" | "anuncio" | "step" | "suposto";

export interface SuportePart {
  id: string;
  name: string;
  kind: PartKind;
  versions: SuporteVersion[];
  qty: number;
  spec: string;
  /** Why this part and not another. */
  criterion: string;
  evidence: Evidence;
  /** File under /suporte/ for printed parts and jigs, when there is one. */
  file?: string;
}

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  calculado: "calculado",
  medido: "medido com paquímetro ou fotos",
  padrao: "medida padrão da peça",
  anuncio: "anúncio de venda, ainda não conferido",
  step: "modelo STEP V1",
  suposto: "suposição, a confirmar",
};

const both: SuporteVersion[] = ["v1", "v2"];

export const SUPORTE_PARTS: SuportePart[] = [
  // ---- printed ---------------------------------------------------------------------------
  { id: "M1", name: "Suporte: caixa luminosa, coluna e braço", kind: "impressa", versions: both, qty: 1, evidence: "calculado",
    spec: "PLA, base 90 × 115 × 40 mm, 210,2 mm de altura, cantos de 6 mm, janela de alívio de 30 mm na coluna",
    criterion: "Uma peça só mantém a luz alinhada com a objetiva. A janela corta metade do material e é um furo vertical quando a peça é impressa deitada, sem suportes nela.",
    file: "mecanica/{v}/suporte-base-coluna-impressao.stl" },
  { id: "M2", name: "Abraçadeira do tubo", kind: "impressa", versions: both, qty: 1, evidence: "medido",
    spec: "Anel de 22 mm de altura, furo de 33,7 mm, dois parafusos M3 × 16",
    criterion: "Segura o tubo por atrito e deixa o foco ser refinado deslizando o tubo. Meia peça removível para encaixar a cabeça com o colar inferior.",
    file: "mecanica/comum/abracadeira-tubo-impressao.stl" },
  { id: "M3", name: "Tampa de fundo", kind: "impressa", versions: both, qty: 1, evidence: "calculado",
    spec: "Placa de 2,4 mm com porta-LED; v1 leva o berço da pilha, v2 leva 4 suportes da placa do dimmer",
    criterion: "Tudo o que é eletrônico fica na tampa: ao tirá-la, LED, pilha ou placa saem juntos.",
    file: "mecanica/{v}/tampa-fundo.stl" },
  { id: "M4", name: "Difusor", kind: "impressa", versions: both, qty: 1, evidence: "calculado",
    spec: "Disco de ⌀ 26 × 0,8 mm em PLA natural ou branco",
    criterion: "Um LED de 5 mm sozinho faz um ponto brilhante no campo; o disco espalha a luz sobre a janela.",
    file: "mecanica/comum/difusor.stl" },

  // ---- pregoscopio, from the STEP ------------------------------------------------------------
  { id: "P1", name: "Cabeça: placa e haste roscada", kind: "referencia", versions: both, qty: 1, evidence: "step",
    spec: "50 × 15 mm, haste de 170 mm", criterion: "Apoia no topo do anel (M2) e segura o celular ou a câmera pelas garras.", file: "pregoscopio/pregoscopio-1.stl" },
  { id: "P2", name: "Tubo externo", kind: "referencia", versions: both, qty: 1, evidence: "medido",
    spec: "⌀ 33,5 mm e 115 mm de comprimento, medidos com paquímetro (o STEP V1 dizia 30 mm)",
    criterion: "O 3D e o anel M2 usam o valor medido. O STEP V1 é de uma versão anterior: confira no gabarito G1." },
  { id: "P3", name: "Tubo interno (telescópico)", kind: "referencia", versions: both, qty: 1, evidence: "medido",
    spec: "⌀ 22,5 mm; sai até 40 mm do tubo externo; escala em mm impressa no tubo",
    criterion: "Desliza dentro do tubo externo e faz o foco. A objetiva rosqueia direto na ponta dele; a escala impressa dá a leitura da posição de foco." },
  { id: "P4", name: "Garra esquerda", kind: "referencia", versions: both, qty: 1, evidence: "step", spec: "10 mm de espessura", criterion: "Prende um lado do aparelho de captura.", file: "pregoscopio/pregoscopio-4.stl" },
  { id: "P5", name: "Garra direita", kind: "referencia", versions: both, qty: 1, evidence: "step", spec: "10 mm de espessura", criterion: "Prende o outro lado do aparelho de captura, em oposição à garra esquerda.", file: "pregoscopio/pregoscopio-5.stl" },
  { id: "P6", name: "Manopla direita", kind: "referencia", versions: both, qty: 1, evidence: "step",
    spec: "⌀ 34 mm", criterion: "Aperta a garra direita na haste.", file: "pregoscopio/pregoscopio-6.stl" },
  { id: "P10", name: "Manopla esquerda (espelho da P6)", kind: "referencia", versions: both, qty: 1, evidence: "suposto",
    spec: "⌀ 34 mm, igual à P6", criterion: "O STEP V1 traz uma só manopla e a foto da peça impressa mostra duas: esta é a P6 espelhada.", file: "pregoscopio/pregoscopio-9.stl" },
  { id: "P9", name: "Objetiva 40x / 0,65", kind: "comprada", versions: both, qty: 1, evidence: "medido",
    spec: "⌀ 20 mm, 38 mm de comprimento com a rosca RMS; 35 mm ficam abaixo do tubo interno; ponta com mola; 160/0,17",
    criterion: "A objetiva rosqueia direto no tubo interno e define a altura do suporte. Ela e o ocular WF10X (canudo de ⌀ 23,2 mm, que só cabe no tubo externo) foram calculados para 160 mm entre o ombro da objetiva e a borda onde o ocular apoia; com este pregoscópio o comprimento é 134 mm na posição de trabalho e no máximo 155 mm (ver o painel de óptica na aba Eletrônica). A distância de trabalho dos 40x/0,65 de 160 mm vai de 0,4 a 0,8 mm (o mais comum é 0,6 mm); o projeto parte de 0,8 mm e o foco fino é feito deslizando o tubo interno. A ponta tem mola e cede se tocar a lâmina." },
  { id: "L1", name: "Lâmina de microscopia", kind: "comprada", versions: both, qty: 1, evidence: "padrao",
    spec: "76 × 26 × 1 mm, vidro", criterion: "Medida padrão do mercado. O canal da caixa tem folga de 0,6 mm; confira no gabarito G2." },

  // ---- electronics -------------------------------------------------------------------------------
  { id: "D1", name: "LED branco 5 mm difuso", kind: "comprada", versions: both, qty: 1, evidence: "padrao",
    spec: "Vf ≈ 3,1 V a 20 mA, ângulo de 100° ou mais, corpo leitoso",
    criterion: "Ângulo largo e corpo difuso dão luz mais uniforme sob a lâmina. LED de feixe estreito (15°) faz um ponto quente no campo." },
  { id: "R1", name: "Resistor R1 (ajuste da corrente)", kind: "comprada", versions: both, qty: 1, evidence: "calculado",
    spec: "68 Ω ¼ W 1 %, filme metálico (azul, cinza, preto, dourado, marrom); 18,4 mA nas duas versões",
    criterion: "1,25 V / 68 Ω = 18,4 mA, abaixo dos 20 mA do LED. Dissipa 23 mW, bem abaixo de ¼ W, e o 1 % mantém a corrente estável." },
  { id: "C1", name: "Capacitor cerâmico 100 nF", kind: "comprada", versions: both, qty: 1, evidence: "padrao",
    spec: "100 nF (104) 50 V, passo de 5 mm, entre a entrada do U1 e o GND",
    criterion: "O datasheet do LM317 pede 0,1 µF na entrada quando o regulador fica longe do capacitor da fonte. Os fios da pilha e do conector são longos." },
  { id: "D2", name: "Diodo 1N5819 (proteção de polaridade)", kind: "comprada", versions: ["v2"], qty: 1, evidence: "padrao",
    spec: "Schottky 1 A 40 V, DO-41, em série no positivo do conector J1",
    criterion: "Impede que um plugue com polaridade invertida chegue ao LM317. O Schottky derruba cerca de 0,4 V, contra 0,7 V do 1N4007, e o mínimo de entrada fica em 6,75 V." },
  { id: "SW1", name: "Interruptor de balancim KCD1-101", kind: "comprada", versions: both, qty: 1, evidence: "anuncio",
    spec: "2 terminais, liga-desliga, recorte de painel de 21,2 × 15,0 mm",
    criterion: "Modelo comum, barato e com recorte retangular padrão que a caixa já tem. A medida vem do guia da LCSC; confirme no gabarito G2." },
  { id: "BT1", name: "Bateria 9 V (6F22) com clipe", kind: "comprada", versions: ["v1"], qty: 1, evidence: "padrao",
    spec: "48,5 × 26,5 × 17,5 mm, alcalina, cerca de 500 mAh",
    criterion: "O LM317 mantém 18,4 mA enquanto a pilha estiver acima de 6,35 V, cerca de 22 horas (80 % dos 500 mAh). É a pilha que o berço da tampa comporta." },
  { id: "PS1", name: "Fonte 12 V 500 mA", kind: "comprada", versions: ["v2"], qty: 1, evidence: "suposto",
    spec: "Plugue P4 5,5 × 2,1 mm, centro positivo",
    criterion: "12 V sobram acima do mínimo de 6,75 V (LED, LM317 e diodo) e 500 mA cobrem 18 mA com folga. Confirme com o multímetro que o centro do plugue é positivo antes de ligar." },
  { id: "J1", name: "Conector P4 de painel DC-022B", kind: "comprada", versions: ["v2"], qty: 1, evidence: "anuncio",
    spec: "5,5 × 2,1 mm, furo de painel de 7,8 mm",
    criterion: "Com porca, fixa na parede de 2,4 mm. O DC-022 simples pede furo de 11 a 12 mm: confira qual você comprou no gabarito G2." },
  { id: "U1", name: "LM317T regulador ajustável", kind: "comprada", versions: both, qty: 1, evidence: "calculado",
    spec: "TO-220, referência de 1,2 a 1,3 V (típico 1,25 V), carga mínima típica de 3,5 mA e garantida até 5 mA (ST) ou 10 mA (TI)",
    criterion: "Corrente constante (I = 1,25 V / R) em vez de PWM: a câmera não grava faixas e, na v1, o brilho não cai quando a pilha descarrega. Dissipa até 0,1 W, sem dissipador." },
  { id: "RV1", name: "Reostato linear 220 Ω (WH148 B221)", kind: "comprada", versions: ["v2"], qty: 1, evidence: "anuncio",
    spec: "Eixo de 6 mm, rosca M7, com botão",
    criterion: "Em série com R1 varia a corrente de 18 mA a 4,3 mA. O piso de 4,3 mA fica acima da carga mínima típica do LM317 (3,5 mA), mas abaixo da máxima garantida (5 a 10 mA conforme o fabricante): se o brilho mínimo oscilar, troque o reostato por um de 100 a 150 Ω ou ligue uma carga fixa de 5 mA na saída. Não use um reostato maior que 220 Ω. É linear porque é o que se acha com facilidade nesse valor; a mudança de brilho fica concentrada no lado claro." },
  { id: "PCB1", name: "Placa do driver (40 × 25 mm na v1, 70 × 25 mm na v2)", kind: "comprada", versions: both, qty: 1, evidence: "calculado",
    spec: "4 furos M3 a 3,5 mm das bordas; Gerbers incluídos ou placa perfurada",
    criterion: "Os Gerbers passaram numa checagem independente de contorno, furos e distância do cobre. As trilhas e a máscara ainda não foram vistas num programa de PCB: confira antes de fabricar." },

  // ---- hardware -----------------------------------------------------------------------------------
  { id: "H1", name: "Parafuso M3 × 10 autoatarraxante", kind: "comprada", versions: both, qty: 4, evidence: "calculado",
    spec: "Cabeça panela", criterion: "Prendem a tampa de fundo (2,4 mm de chapa mais 7,6 mm nos suportes)." },
  { id: "H2", name: "Parafuso M3 × 16 autoatarraxante", kind: "comprada", versions: both, qty: 2, evidence: "calculado",
    spec: "Cabeça panela", criterion: "Atravessam a orelha da abraçadeira (10 mm) mais a abertura de 0,6 mm e entram 8 mm na outra." },
  { id: "H3", name: "Parafuso M3 × 8 autoatarraxante", kind: "comprada", versions: both, qty: 4, evidence: "calculado",
    spec: "Cabeça panela", criterion: "Prendem a placa do driver nos suportes de 6 mm." },

  // ---- consumables ---------------------------------------------------------------------------------
  { id: "W1", name: "Fio flexível 24 AWG (vermelho, preto e mais uma cor)", kind: "comprada", versions: both, qty: 1, evidence: "calculado",
    spec: "v1: 6 fios de 65 a 130 mm (0,6 m no total); v2: 9 fios de 85 a 170 mm (1,3 m no total); pontas estanhadas (ver a lista de corte no manual)",
    criterion: "Fio fino e flexível passa pelo furo do porta-LED e entre as peças sem forçar os terminais da placa. Vermelho no positivo, preto no GND e outra cor nos demais." },
  { id: "W2", name: "Tubo termorretrátil ⌀ 2 a 3 mm", kind: "comprada", versions: both, qty: 1, evidence: "calculado",
    spec: "10 cm, uma luva de 1 cm por emenda",
    criterion: "Isola as soldas dos fios do LED, que passam rente ao porta-LED e à tampa." },
  { id: "W3", name: "Cola quente e fita dupla face", kind: "comprada", versions: both, qty: 1, evidence: "calculado",
    spec: "pontos de cola de 3 a 4 mm; fita de 12 mm",
    criterion: "Cola o difusor no encaixe do teto da caixa por dentro e prende os fios soltos." },

  // ---- calibration jigs --------------------------------------------------------------------------
  { id: "G1", name: "Gabarito do tubo", kind: "calibracao", versions: both, qty: 1, evidence: "calculado",
    spec: "270 × 48 × 3,6 mm, 7 furos de 30,2 a 36,4 mm", criterion: "Cobre as medidas do STEP (30 e 36 mm) e do paquímetro (33 a 34 mm).", file: "mecanica/calibracao/calibracao-tubo.stl" },
  { id: "G2", name: "Gabarito das peças", kind: "calibracao", versions: both, qty: 1, evidence: "calculado",
    spec: "174 × 208 × 3,6 mm: lâmina, interruptor, LED, parafuso, conector DC, eixo do reostato", criterion: "Todos os furos de recorte da caixa saem de uma só impressão.", file: "mecanica/calibracao/calibracao-pecas.stl" },
  { id: "G3", name: "Gabarito da bateria", kind: "calibracao", versions: ["v1"], qty: 1, evidence: "calculado",
    spec: "252 × 42 × 3,6 mm, 4 aberturas de 48,6 × 26,6 a 50,1 × 28,1 mm", criterion: "A bateria é grande demais para caber na placa G2.", file: "mecanica/calibracao/calibracao-bateria.stl" },
];

export interface BomLine {
  part: SuportePart;
  qty: number;
}

/** Parts needed for one version of the light, in catalog order. */
export function bom(version: SuporteVersion): BomLine[] {
  return SUPORTE_PARTS.filter((p) => p.versions.includes(version)).map((part) => ({ part, qty: part.qty }));
}

/** Path of the part's file for a version ("{v}" stands for "v1-pilha" or "v2-fonte"). */
export function partFile(part: SuportePart, version: SuporteVersion): string | undefined {
  return part.file?.replace("{v}", version === "v1" ? "v1-pilha" : "v2-fonte");
}

/** What to type in a shop's search box for each purchased part. */
const SEARCH: Record<string, string> = {
  P9: "objetiva acromática 40x 0,65 RMS 160/0,17",
  L1: "lâmina de microscopia 76x26 mm vidro",
  D1: "LED branco 5mm difuso leitoso 120 graus",
  R1: "resistor 68R 1/4W 1% filme metálico",
  C1: "capacitor cerâmico 100nF 104 50V",
  D2: "diodo 1N5819 schottky 1A 40V DO-41",
  SW1: "chave gangorra KCD1-101 2 terminais",
  BT1: "bateria 9V alcalina 6F22 e conector clip para bateria 9V",
  PS1: "fonte 12V 500mA plugue P4 5,5x2,1 centro positivo",
  J1: "conector P4 fêmea de painel DC-022B 5,5x2,1 com porca",
  U1: "LM317T TO-220",
  RV1: "potenciômetro 220R linear WH148 B221 eixo 6mm com knob",
  PCB1: "placa perfurada 4x6cm (v1) ou 7x3cm (v2), ou fabrique com os Gerbers",
  H1: "parafuso M3 autoatarraxante 10mm cabeça panela",
  H2: "parafuso M3 autoatarraxante 16mm cabeça panela",
  H3: "parafuso M3 autoatarraxante 8mm cabeça panela",
  W1: "fio flexível 24 AWG 3 cores (vermelho, preto e outra)",
  W2: "tubo termorretrátil 2mm ou 3mm",
  W3: "cola quente bastão fino e fita dupla face 12mm",
};

/**
 * Shopping list of one version as CSV (semicolon-separated, with a byte-order mark so Excel in Portuguese opens it).
 * The price column is left empty on purpose: prices change and none was checked.
 */
export function bomCsv(version: SuporteVersion): string {
  const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const lines = [["ID", "Peça", "Especificação", "Quantidade", "O que procurar", "Confiança nos números", "Preço (preencher)"]];
  for (const { part, qty } of bom(version)) {
    if (part.kind !== "comprada") continue;
    lines.push([part.id, part.name, part.spec, String(qty), SEARCH[part.id] ?? "", EVIDENCE_LABEL[part.evidence], ""]);
  }
  return "\uFEFF" + lines.map((l) => l.map(cell).join(";")).join("\r\n") + "\r\n";
}
