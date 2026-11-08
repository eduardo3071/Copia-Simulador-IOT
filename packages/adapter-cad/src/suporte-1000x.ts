/**
 * Economical 1000x version: 100x/1.25 oil objective + 10x eyepiece, 3 W LED on a heatsink under an iris diaphragm and the diffuser,
 * no condenser (see docs/projeto-1000x.md, section 7). Layout, dimensions of every component and the checks between them.
 * Every number says where it comes from: "fonte" (a page or datasheet), "medido" (caliper on the project's own parts),
 * "calculado" (from other numbers) or "suposto" (a guess that must be measured on the part that is bought).
 */
import { DEFAULT_HOLDER_PARAMS, holderLayout, type HolderLayout, type HolderParams } from "./holder.ts";
import { OBJECTIVES } from "./suporte-optica.ts";

export type Evidence1000 = "fonte" | "medido" | "calculado" | "suposto";

export interface Component1000 {
  id: string;
  name: string;
  /** Dimensions in mm, as the 3D draws them. */
  dims: string;
  evidence: Evidence1000;
  /** Where the number comes from, or what to measure. */
  note: string;
  /** True for the parts the project prints. */
  printed?: boolean;
}

const OBJ = OBJECTIVES["100x"];
/** Working distance to the cover glass plus the cover glass itself (0.17 mm). */
export const COVER_GLASS = 0.17;
export const OBJECTIVE_100X_WD = 0.18;

export const ECONOMICA_1000X_PARAMS: HolderParams = {
  ...DEFAULT_HOLDER_PARAMS,
  variant: "fonte1000",
  // flange-to-specimen of 45 mm (Bresser, Optika) minus the working distance: what hangs under the inner tube
  objectiveLength: OBJ.belowShoulder - OBJECTIVE_100X_WD,
  workingDistance: OBJECTIVE_100X_WD + COVER_GLASS,
};

export const layoutEconomica1000x = (): HolderLayout => holderLayout(ECONOMICA_1000X_PARAMS);

export function componentes1000x(layout: HolderLayout = layoutEconomica1000x()): Component1000[] {
  const p = layout.params;
  const t = layout.lightTube!;
  const f = (n: number) => n.toFixed(1).replace(".", ",");
  return [
    { id: "P9", name: "Objetiva 100x/1,25 em óleo", dims: `⌀ ${f(p.objectiveDiameter)} × ${f(p.objectiveLength)} mm sob o ombro (+ 3 de rosca RMS), ponta com mola`, evidence: "suposto",
      note: "parafocal de 45 mm (Bresser, Optika) menos 0,18 mm de trabalho; o diâmetro vem da 40x. Medir: ombro até a ponta, parafocal, trabalho, ponta." },
    { id: "CV1", name: "Lamínula 22 × 22 × 0,17 mm", dims: "22 × 22 × 0,17 mm", evidence: "fonte", note: "Knittel e Laborglas 22 × 22 mm, 0,13 a 0,17 mm; a objetiva 160/0,17 é corrigida para 0,17 mm" },
    { id: "OIL", name: "Gota de óleo de imersão", dims: `⌀ 5 × ${f(p.workingDistance - COVER_GLASS)} mm`, evidence: "fonte", note: "uma gota de ≈ 5 mm basta (guia da Kasvi); índice 1,518 no Zeiss Immersol 518 F" },
    { id: "L1", name: "Lâmina 76 × 26 × 1 mm", dims: "76 × 26 × 1 mm", evidence: "fonte", note: "ISO 8037/1" },
    { id: "M4", name: "Difusor de PLA", dims: `⌀ ${f(p.diffuserDiameter)} × ${f(p.diffuserThickness)} mm`, evidence: "medido", note: "impresso, igual ao da v1 e da v2", printed: true },
    { id: "IR1", name: "Diafragma de íris mecânico, 1,5 a 25 mm", dims: `⌀ ${f(p.irisDiameter)} × ${f(p.irisThickness)} mm, abertura de 1,5 a 25 mm`, evidence: "suposto",
      note: "só a faixa de abertura vem do anúncio (eBay); o corpo é suposto. Medir diâmetro externo e espessura" },
    { id: "M5", name: "Tubo de luz (impresso, preto)", dims: `⌀ ${f(t.outerDiameter)} ext. / ${f(t.innerDiameter)} int. × ${f(t.top - t.bottom)} mm, anel de apoio de ${f(t.stopThickness)} mm com furo de ${f(t.stopBore)} mm`, evidence: "calculado",
      note: "segue o diâmetro da íris + 0,4 mm de folga; 12 furos de ventilação de 3,4 mm na tampa em volta do dissipador", printed: true },
    { id: "D1", name: "LED branco frio de 3 W em estrela de alumínio", dims: `estrela ⌀ ${f(p.ledStarDiameter)} × ${f(p.ledStarThickness)} mm, emissor ≈ ⌀ 6 × 3,2 mm`, evidence: "suposto",
      note: "3,3 a 3,6 V, 700 mA, 240 a 300 lm (Usinainfo); operado a 350 mA. A página dá ≈ 15 × 8 × 5 mm sem dizer o que é; medir a estrela" },
    { id: "HS1", name: "Dissipador redondo de alumínio", dims: `⌀ ${f(p.heatsinkDiameter)} × ${f(p.heatsinkHeight)} mm`, evidence: "suposto", note: "o tamanho é suposto; precisa caber no tubo de luz (≤ 40 mm) e levar a estrela com pasta térmica" },
    { id: "DR1", name: "Driver de corrente constante, 350 mA", dims: "30 × 20 × 10 mm", evidence: "suposto", note: "o K2679 achado é de 700 mA e não teve o tamanho publicado; medir o módulo escolhido" },
    { id: "PCB1", name: "Placa ilhada 40 × 25 mm", dims: "40 × 25 × 1,6 mm, furos M3 a 3,5 mm das bordas", evidence: "medido", note: "leva o driver e o diodo D2; cortada de uma placa ilhada de 5 × 7 cm" },
    { id: "D2", name: "Diodo 1N5819", dims: "DO-41, 5 × ⌀ 2,7 mm", evidence: "fonte", note: "proteção contra plugue ao contrário, antes do driver" },
    { id: "SW1", name: "Chave KCD1-101", dims: `recorte ${f(p.switchCutout.width)} × ${f(p.switchCutout.height)} mm`, evidence: "fonte", note: "LCSC" },
    { id: "J1", name: "Conector P4 DC-022B", dims: `furo ⌀ ${f(p.jackDiameter)} mm`, evidence: "fonte", note: "5,5 × 2,1 mm; furo de 7,8 mm na maioria dos anúncios" },
    { id: "PS1", name: "Fonte chaveada 12 V 1 A", dims: "plugue P4 5,5 × 2,1 mm, centro positivo", evidence: "fonte", note: "Usinainfo" },
  ];
}

export interface Derived1000 {
  /** Distance from the objective shoulder to the rim of the outer tube (mechanical tube length). */
  tubeLength: number;
  /** Height of the tube top over the specimen. */
  tubeTopOverSpecimen: number;
  /** Total height of the holder. */
  totalHeight: number;
  /** Gap between the objective tip and the cover glass at best focus. */
  workingDistance: number;
  emitterToIris: number;
  /** Electrical power of the LED at the chosen current and the heat it leaves in the box, as a range (W). */
  ledWatts: number;
  heatWatts: [number, number];
  /** Free clearance between the heatsink and the tube wall (mm). */
  heatsinkClearance: number;
}

export const LED_CURRENT_A = 0.35;
export const LED_VF_V = 3.45;

export function derived1000x(layout: HolderLayout = layoutEconomica1000x()): Derived1000 {
  const p = layout.params;
  const t = layout.lightTube!;
  const watts = LED_CURRENT_A * LED_VF_V;
  return {
    tubeLength: p.tubeLength + p.sleeveLength + p.innerPull,
    tubeTopOverSpecimen: layout.tube.top - layout.samplePlane,
    totalHeight: layout.totalHeight,
    workingDistance: p.workingDistance - COVER_GLASS,
    emitterToIris: t.emitterToIris,
    ledWatts: watts,
    // a white LED turns about 20 to 40 % of the power into light (general figure), the rest is heat
    heatWatts: [watts * 0.6, watts * 0.8],
    heatsinkClearance: (t.innerDiameter - p.heatsinkDiameter) / 2,
  };
}
