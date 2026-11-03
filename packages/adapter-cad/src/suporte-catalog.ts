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
  { id: "P2", name: "Tubo externo", kind: "referencia", versions: both, qty: 1, evidence: "step",
    spec: "⌀ 30 mm no STEP; ⌀ 33,5 mm medido com paquímetro",
    criterion: "O anel M2 foi dimensionado para o valor medido. O STEP V1 é de uma versão anterior: confira no gabarito C1.", file: "pregoscopio/pregoscopio-2.stl" },
  { id: "P3", name: "Tubo interno (telescópico)", kind: "referencia", versions: both, qty: 1, evidence: "step",
    spec: "⌀ 23,4 mm no STEP; ⌀ 22,5 mm medido; curso de 40 mm", criterion: "Faz o foco fino. Move junto com P7 e P8.", file: "pregoscopio/pregoscopio-3.stl" },
  { id: "P4", name: "Garra esquerda", kind: "referencia", versions: both, qty: 1, evidence: "step", spec: "10 mm de espessura", criterion: "Prende um lado do aparelho de captura.", file: "pregoscopio/pregoscopio-4.stl" },
  { id: "P5", name: "Garra direita", kind: "referencia", versions: both, qty: 1, evidence: "step", spec: "10 mm de espessura", criterion: "Prende o outro lado do aparelho de captura, em oposição à garra esquerda.", file: "pregoscopio/pregoscopio-5.stl" },
  { id: "P6", name: "Manopla direita", kind: "referencia", versions: both, qty: 1, evidence: "step",
    spec: "⌀ 34 mm", criterion: "Aperta a garra direita na haste.", file: "pregoscopio/pregoscopio-6.stl" },
  { id: "P10", name: "Manopla esquerda (espelho da P6)", kind: "referencia", versions: both, qty: 1, evidence: "suposto",
    spec: "⌀ 34 mm, igual à P6", criterion: "O STEP V1 traz uma só manopla e a foto da peça impressa mostra duas: esta é a P6 espelhada.", file: "pregoscopio/pregoscopio-9.stl" },
  { id: "P7", name: "Anel da objetiva", kind: "referencia", versions: both, qty: 1, evidence: "step", spec: "⌀ 27,5 mm × 5,5 mm", criterion: "Faz a transição do tubo interno para a objetiva.", file: "pregoscopio/pregoscopio-7.stl" },
  { id: "P8", name: "Luva inferior", kind: "referencia", versions: both, qty: 1, evidence: "step", spec: "⌀ 36 mm × 20 mm", criterion: "Cobre a rosca da objetiva.", file: "pregoscopio/pregoscopio-8.stl" },
  { id: "P9", name: "Objetiva 40x / 0,65", kind: "comprada", versions: both, qty: 1, evidence: "medido",
    spec: "⌀ 20 mm, 35 mm abaixo do tubo interno, distância de trabalho típica de 0,8 mm",
    criterion: "A objetiva já faz parte do pregoscópio. Ela define a altura do suporte: a lente fica a 0,8 mm da lâmina." },
  { id: "L1", name: "Lâmina de microscopia", kind: "comprada", versions: both, qty: 1, evidence: "padrao",
    spec: "76 × 26 × 1 mm, vidro", criterion: "Medida padrão do mercado. O canal da caixa tem folga de 0,6 mm; confira no gabarito C2." },

  // ---- electronics -------------------------------------------------------------------------------
  { id: "D1", name: "LED branco 5 mm difuso", kind: "comprada", versions: both, qty: 1, evidence: "padrao",
    spec: "Vf ≈ 3,1 V a 20 mA, ângulo de 100° ou mais, corpo leitoso",
    criterion: "Ângulo largo e corpo difuso dão luz mais uniforme sob a lâmina. LED de feixe estreito (15°) faz um ponto quente no campo." },
  { id: "R1", name: "Resistor limitador", kind: "comprada", versions: both, qty: 1, evidence: "calculado",
    spec: "v1: 330 Ω ¼ W 1 % (≈ 17,9 mA). v2: 47 Ω ¼ W 1 % (ajuste de corrente)",
    criterion: "Filme metálico 1 % mantém a corrente estável. A dissipação é de 0,1 W na v1 e de 33 mW na v2, bem abaixo de ¼ W." },
  { id: "SW1", name: "Interruptor de balancim KCD1-101", kind: "comprada", versions: both, qty: 1, evidence: "anuncio",
    spec: "2 terminais, liga-desliga, recorte de painel de 21,2 × 15,0 mm",
    criterion: "Modelo comum, barato e com recorte retangular padrão que a caixa já tem. A medida vem do guia da LCSC; confirme no gabarito C2." },
  { id: "BT1", name: "Bateria 9 V (6F22) com clipe", kind: "comprada", versions: ["v1"], qty: 1, evidence: "padrao",
    spec: "48,5 × 26,5 × 17,5 mm, alcalina, cerca de 500 mAh",
    criterion: "Passa com sobra da queda do LED (3,1 V) e dura cerca de 28 horas a 17,9 mA. É a pilha que o berço da tampa comporta." },
  { id: "PS1", name: "Fonte 12 V 500 mA", kind: "comprada", versions: ["v2"], qty: 1, evidence: "suposto",
    spec: "Plugue P4 5,5 × 2,1 mm, centro positivo",
    criterion: "12 V sobram acima do mínimo de 6,3 V do LM317 e 500 mA cobrem 27 mA com folga. Confirme a polaridade do plugue antes de ligar." },
  { id: "J1", name: "Conector P4 de painel DC-022B", kind: "comprada", versions: ["v2"], qty: 1, evidence: "anuncio",
    spec: "5,5 × 2,1 mm, furo de painel de 7,8 mm",
    criterion: "Com porca, fixa na parede de 2,4 mm. O DC-022 simples pede furo de 11 a 12 mm: confira qual você comprou no gabarito C2." },
  { id: "U1", name: "LM317T regulador ajustável", kind: "comprada", versions: ["v2"], qty: 1, evidence: "calculado",
    spec: "TO-220, referência de 1,25 V, carga mínima de cerca de 3,5 mA",
    criterion: "Corrente constante em vez de PWM: a câmera do celular não grava faixas. Dissipa até 0,2 W, sem dissipador." },
  { id: "RV1", name: "Reostato linear 220 Ω (WH148 B221)", kind: "comprada", versions: ["v2"], qty: 1, evidence: "anuncio",
    spec: "Eixo de 6 mm, rosca M7, com botão",
    criterion: "Em série com R1 varia a corrente de 4,7 a 26,6 mA. O piso de 4,7 mA fica acima da carga mínima do LM317." },
  { id: "PCB1", name: "Placa do dimmer 60 × 25 mm", kind: "comprada", versions: ["v2"], qty: 1, evidence: "calculado",
    spec: "4 furos M3 a 3,5 mm das bordas; Gerbers incluídos ou placa perfurada",
    criterion: "Os Gerbers saem do autorroteador e não foram abertos num visualizador independente: confira antes de fabricar." },

  // ---- hardware -----------------------------------------------------------------------------------
  { id: "H1", name: "Parafuso M3 × 10 autoatarraxante", kind: "comprada", versions: both, qty: 4, evidence: "calculado",
    spec: "Cabeça panela", criterion: "Prendem a tampa de fundo (2,4 mm de chapa mais 7,6 mm nos suportes)." },
  { id: "H2", name: "Parafuso M3 × 16 autoatarraxante", kind: "comprada", versions: both, qty: 2, evidence: "calculado",
    spec: "Cabeça panela", criterion: "Atravessam a orelha da abraçadeira (10 mm) mais a abertura de 0,6 mm e entram 8 mm na outra." },
  { id: "H3", name: "Parafuso M3 × 8 autoatarraxante", kind: "comprada", versions: ["v2"], qty: 4, evidence: "calculado",
    spec: "Cabeça panela", criterion: "Prendem a placa do dimmer nos suportes de 6 mm." },

  // ---- calibration jigs --------------------------------------------------------------------------
  { id: "C1", name: "Gabarito do tubo", kind: "calibracao", versions: both, qty: 1, evidence: "calculado",
    spec: "270 × 48 × 3,6 mm, 7 furos de 30,2 a 36,4 mm", criterion: "Cobre as medidas do STEP (30 e 36 mm) e do paquímetro (33 a 34 mm).", file: "mecanica/calibracao/calibracao-tubo.stl" },
  { id: "C2", name: "Gabarito das peças", kind: "calibracao", versions: both, qty: 1, evidence: "calculado",
    spec: "174 × 208 × 3,6 mm: lâmina, interruptor, LED, parafuso, conector DC, eixo do reostato", criterion: "Todos os furos de recorte da caixa saem de uma só impressão.", file: "mecanica/calibracao/calibracao-pecas.stl" },
  { id: "C3", name: "Gabarito da bateria", kind: "calibracao", versions: ["v1"], qty: 1, evidence: "calculado",
    spec: "252 × 42 × 3,6 mm, 4 aberturas de 48,6 × 26,6 a 50,1 × 28,1 mm", criterion: "A bateria é grande demais para caber na placa C2.", file: "mecanica/calibracao/calibracao-bateria.stl" },
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
