/**
 * Cost of the support and its electronics (the pregoscopio, P1 to P10, is not priced). Prices are Brazilian retail, in R$,
 * as shown on the store pages on 2026-11-07 (Pix / cash price). They change: every line keeps its store, address and date.
 *
 * Two ways of counting, because a prototype buys whole packs and a batch uses them up:
 *  - material used: price per unit of the pack times what one assembled unit consumes;
 *  - purchase: whole packs needed for `units` assembled units (retail price, no wholesale discount, so a ceiling for a batch).
 */
import type { SuporteVersion } from "./suporte-catalog.ts";

export const PRICE_DATE = "2026-11-07";

export type PriceConfidence =
  | "pagina" // read on the product page
  | "anuncio" // marketplace listing seen in search results, page not opened
  | "proxy" // price of a similar item (the exact one was not found)
  | "estimativa"; // computed or median of several listings

export interface PriceSource {
  store: string;
  url: string;
  /** Price of one pack in R$ (Pix / cash). */
  price: number;
  /** Units in the pack. */
  pack: number;
  confidence: PriceConfidence;
  note?: string;
}

export interface CostLine {
  id: string;
  label: string;
  versions: SuporteVersion[];
  /** Pack units used by one assembled unit (can be a fraction). */
  perUnit: number;
  /** Name of the counting unit ("un", "g", "10 cm"...). */
  unit: string;
  source: PriceSource | null;
  note?: string;
}

const both: SuporteVersion[] = ["v1", "v2"];
const bau = "Baú da Eletrônica";
const cdr = "Casa da Robótica";
const usina = "Usinainfo";
const eletrogate = "Eletrogate";

export const PLA_PRICE_PER_KG = 119.99;
/** Density of PLA, g/cm3. */
export const PLA_DENSITY = 1.24;
/** Share of the STL volume that is actually printed: the walls are 2.4 mm, so they are nearly solid. A slicer replaces this guess. */
export const FILL_FACTOR = 0.9;
/** Extra filament for the skirt, purge and failed first layers. */
export const WASTE_FACTOR = 1.1;

/** Solid volume of each printed part in cm3, measured from the STL files of pacote-montagem (a test keeps them in sync). */
export const PRINT_VOLUME_CM3: Record<SuporteVersion, { id: string; label: string; cm3: number }[]> = {
  v1: [
    { id: "M1", label: "Base e coluna (M1)", cm3: 240.1 },
    { id: "M2", label: "Abraçadeira do tubo (M2)", cm3: 9.6 },
    { id: "M3", label: "Tampa de fundo (M3)", cm3: 30.1 },
    { id: "M4", label: "Difusor (M4)", cm3: 0.4 },
  ],
  v2: [
    { id: "M1", label: "Base e coluna (M1)", cm3: 239.9 },
    { id: "M2", label: "Abraçadeira do tubo (M2)", cm3: 9.6 },
    { id: "M3", label: "Tampa de fundo (M3)", cm3: 27.0 },
    { id: "M4", label: "Difusor (M4)", cm3: 0.4 },
  ],
};

export const gramsOf = (cm3: number) => cm3 * PLA_DENSITY * FILL_FACTOR * WASTE_FACTOR;

export const COST_LINES: CostLine[] = [
  { id: "D1", label: "LED branco 5 mm difuso", versions: both, perUnit: 1, unit: "un",
    source: { store: bau, url: "https://www.baudaeletronica.com.br/produto/led-difuso-5mm-branco.html", price: 0.27, pack: 1, confidence: "pagina", note: "página diz 3 V; confira o lote" } },
  { id: "R1", label: "Resistor 68 Ω 1/4 W 1 %", versions: both, perUnit: 1, unit: "un",
    source: { store: cdr, url: "https://www.casadarobotica.com/componentes-eletronicos/componentes/resistor/20-resistor-68-ohm-14-w", price: 3.79, pack: 20, confidence: "pagina", note: "pacote de 20, tolerância de 1 %; a página não diz se é filme metálico" } },
  { id: "C1", label: "Capacitor cerâmico 100 nF 50 V", versions: both, perUnit: 1, unit: "un",
    source: { store: cdr, url: "https://www.casadarobotica.com/componentes-eletronicos/componentes/capacitor/20x-capacitor-ceramico-104-100nf-50v", price: 3.79, pack: 20, confidence: "pagina", note: "pacote de 20; a Usinainfo avisou de lotes marcados 104 que medem 33 nF: meça" } },
  { id: "U1", label: "Regulador LM317T (TO-220)", versions: both, perUnit: 1, unit: "un",
    source: { store: usina, url: "https://www.usinainfo.com.br/regulador-lm/regulador-de-tensao-lm317t-12v-a-37v-4839.html", price: 4.09, pack: 1, confidence: "pagina", note: "página mostra últimas unidades" } },
  { id: "SW1", label: "Chave gangorra KCD1-101", versions: both, perUnit: 1, unit: "un",
    source: { store: bau, url: "https://www.baudaeletronica.com.br/produto/chave-gangorra-kcd1-101-2-terminais-preta.html", price: 1.44, pack: 1, confidence: "pagina" } },
  { id: "PCB1", label: "Placa de fenolite ilhada 5 × 7 cm", versions: both, perUnit: 1, unit: "un",
    source: { store: cdr, url: "https://www.casadarobotica.com/prototipagem-ferramentas/prototipagem/placas-de-circuito/placa-de-fenolite-ilhada-perfurada-7x5-cm-circuito-impresso", price: 3.79, pack: 1, confidence: "pagina", note: "a placa da v1 (40 × 25) e da v2 (70 × 25) cabem em uma de 5 × 7; placa fabricada a partir dos Gerbers não foi cotada" } },
  { id: "H1", label: "Parafuso M3 × 10 Phillips", versions: both, perUnit: 4, unit: "un",
    source: { store: usina, url: "https://www.usinainfo.com.br/parafuso-metalico-m3-a-m5/parafuso-philips-m3-x-10mm-metalico-kit-com-10-unidades-5544.html", price: 2.96, pack: 10, confidence: "pagina", note: "parafuso de máquina; autoatarraxante M3 não é vendido com esse nome" } },
  { id: "H2", label: "Parafuso M3 × 16 Phillips", versions: both, perUnit: 2, unit: "un",
    source: { store: usina, url: "https://www.usinainfo.com.br/parafuso-metalico-m3-a-m5/parafuso-philips-m3-x-20mm-metalico-kit-com-10-unidades-5546.html", price: 3.46, pack: 10, confidence: "proxy", note: "não achei M3 × 16: preço do M3 × 20" } },
  { id: "H3", label: "Parafuso M3 × 8 Phillips", versions: both, perUnit: 4, unit: "un",
    source: { store: usina, url: "https://www.usinainfo.com.br/parafuso-metalico-m3-a-m5/parafuso-philips-m3-x-8mm-metalico-kit-com-10-unidades-5541.html", price: 2.45, pack: 10, confidence: "pagina" } },
  { id: "W1", label: "Fio flexível 24 AWG", versions: both, perUnit: 1, unit: "conjunto", source: null,
    note: "sem preço: o fio 24 AWG da Baú da Eletrônica estava indisponível e não achei outro; custa centavos por unidade" },
  { id: "W2", label: "Tubo termorretrátil 2 mm (10 cm)", versions: both, perUnit: 1, unit: "10 cm",
    source: { store: eletrogate, url: "https://www.eletrogate.com/tubo-termo-retratil-2mm-1-metro", price: 1.71, pack: 10, confidence: "pagina", note: "R$ 1,71 por 1 m = 10 pedaços de 10 cm" } },
  { id: "W3", label: "Cola quente (1/10 de bastão)", versions: both, perUnit: 1, unit: "1/10 bastão",
    source: { store: usina, url: "https://www.usinainfo.com.br/pistola-de-cola-quente/bastao-de-cola-quente-refil-de-cola-quente-preto-11mmx300mm-794.html", price: 4.81, pack: 10, confidence: "estimativa", note: "bastão de 11 mm; a fita dupla face de 12 mm não foi cotada" } },
  { id: "L1", label: "Lâmina de microscopia 76 × 26 mm", versions: both, perUnit: 1, unit: "un",
    source: { store: "Mercado Livre", url: "https://produto.mercadolivre.com.br/MLB-1879257334-lminas-para-microscopia-26x76mm-lisa-lapidada-50-unidades-_JM", price: 14.9, pack: 50, confidence: "anuncio", note: "caixa de 50; preço visto na busca, página não aberta" } },
  { id: "BT1", label: "Bateria alcalina 9 V", versions: ["v1"], perUnit: 1, unit: "un",
    source: { store: "Mercado Livre", url: "https://www.mercadolivre.com.br/bateria-alcalina-9v-blister-embalagem-com-1-unidade-elgin/p/MLB19692869", price: 8, pack: 1, confidence: "anuncio", note: "Elgin, preço visto na busca; outras marcas chegam a R$ 26" } },
  { id: "BT1-clip", label: "Clipe de bateria 9 V com cabos", versions: ["v1"], perUnit: 1, unit: "un",
    source: { store: bau, url: "https://www.baudaeletronica.com.br/produto/clip-de-bateria-9v-tipo-1-vertical-t.html", price: 1.34, pack: 1, confidence: "pagina", note: "cabos de 28 AWG" } },
  { id: "PS1", label: "Fonte chaveada 12 V 1 A, plugue P4", versions: ["v2"], perUnit: 1, unit: "un",
    source: { store: usina, url: "https://www.usinainfo.com.br/fonte-chaveada-usb-e-p4/fonte-de-alimentacao-chaveada-12vdc-1a-plug-p4-55x21mm-3082.html", price: 26.11, pack: 1, confidence: "pagina", note: "o projeto pede 12 V 500 mA; a de 1 A serve (centro positivo)" } },
  { id: "J1", label: "Conector P4 de painel DC-022B", versions: ["v2"], perUnit: 1, unit: "un",
    source: { store: "Shopee (via escorregaopreco.com.br)", url: "", price: 16.99, pack: 10, confidence: "anuncio", note: "kit de 10 DC-022B visto na busca (Shopee), endereço não guardado; a página da Usinainfo não mostrou preço" } },
  { id: "RV1", label: "Potenciômetro linear WH148 (eixo de 6 mm)", versions: ["v2"], perUnit: 1, unit: "un",
    source: { store: cdr, url: "https://www.casadarobotica.com/componentes-eletronicos/componentes/resistor/potenciometro-5k-wh148-1-l20-3-terminais", price: 3.79, pack: 1, confidence: "proxy", note: "não achei 220 Ω: preço do WH148 de 5 kΩ. O 220 Ω pode ter que vir de importação ou ser outro valor" } },
  { id: "RV1-knob", label: "Knob para eixo estriado de 6 mm", versions: ["v2"], perUnit: 1, unit: "un",
    source: { store: cdr, url: "https://www.casadarobotica.com/componentes-eletronicos/partes/outros/knob-para-potenciometro-estriado-6mm-botao-volume-branco", price: 1.42, pack: 1, confidence: "pagina" } },
  { id: "D2", label: "Diodo 1N5819", versions: ["v2"], perUnit: 1, unit: "un",
    source: { store: bau, url: "https://www.baudaeletronica.com.br/produto/diodo-1n5819.html", price: 0.21, pack: 1, confidence: "pagina" } },
];

export const FILAMENT_SOURCE: PriceSource = {
  store: "Mercado Livre, Magalu, Kabum, Terabyte (anúncios)",
  url: "https://m.magazineluiza.com.br/busca/filamento+pla/",
  price: PLA_PRICE_PER_KG,
  pack: 1000,
  confidence: "estimativa",
  note: "mediana de 5 anúncios de PLA 1 kg, de R$ 89,02 a R$ 132,91",
};

export interface CostRow {
  id: string;
  label: string;
  /** Pack units needed for all the assembled units. */
  need: number;
  unit: string;
  packs: number;
  /** Price of one pack, or null when there is none. */
  packPrice: number | null;
  /** What the pack is called: "20 un". */
  packLabel: string;
  /** Value of what is used up. */
  used: number | null;
  /** Value of the whole packs that have to be bought. */
  purchase: number | null;
  confidence: PriceConfidence | "sem-preco";
  store: string;
  url: string;
  note: string;
}

export interface CostTable {
  version: SuporteVersion;
  units: number;
  rows: CostRow[];
  used: number;
  purchase: number;
  usedPerUnit: number;
  purchasePerUnit: number;
  /** Lines without a price: the totals leave them out. */
  missing: string[];
  grams: number;
}

function row(line: CostLine, units: number): CostRow {
  const need = line.perUnit * units;
  const s = line.source;
  if (!s) {
    return { id: line.id, label: line.label, need, unit: line.unit, packs: 0, packPrice: null, packLabel: "", used: null, purchase: null, confidence: "sem-preco", store: "", url: "", note: line.note ?? "" };
  }
  const packs = Math.ceil(need / s.pack - 1e-9);
  return {
    id: line.id, label: line.label, need, unit: line.unit, packs, packPrice: s.price, packLabel: `${s.pack} ${line.unit}`,
    used: (need / s.pack) * s.price, purchase: packs * s.price, confidence: s.confidence, store: s.store, url: s.url, note: [s.note, line.note].filter(Boolean).join("; "),
  };
}

export function costTable(version: SuporteVersion, units = 1): CostTable {
  const rows = COST_LINES.filter((l) => l.versions.includes(version)).map((l) => row(l, units));
  const parts = PRINT_VOLUME_CM3[version];
  const grams = parts.reduce((s, p) => s + gramsOf(p.cm3), 0);
  const need = grams * units;
  const packs = Math.ceil(need / FILAMENT_SOURCE.pack - 1e-9);
  rows.push({
    id: "PLA", label: `Filamento PLA (${parts.map((p) => p.id).join(", ")}, ${grams.toFixed(0)} g por unidade)`, need, unit: "g", packs, packPrice: FILAMENT_SOURCE.price,
    packLabel: "1000 g", used: (need / FILAMENT_SOURCE.pack) * FILAMENT_SOURCE.price, purchase: packs * FILAMENT_SOURCE.price, confidence: FILAMENT_SOURCE.confidence,
    store: FILAMENT_SOURCE.store, url: FILAMENT_SOURCE.url, note: `${FILAMENT_SOURCE.note}; massa estimada de ${PLA_DENSITY} g/cm³ × ${FILL_FACTOR} de preenchimento × ${WASTE_FACTOR} de perdas: o fatiador dá o valor real`,
  });
  const used = rows.reduce((s, r) => s + (r.used ?? 0), 0);
  const purchase = rows.reduce((s, r) => s + (r.purchase ?? 0), 0);
  return {
    version, units, rows, used, purchase, usedPerUnit: used / units, purchasePerUnit: purchase / units,
    missing: rows.filter((r) => r.confidence === "sem-preco").map((r) => r.id), grams,
  };
}

const brl = (n: number) => n.toFixed(2).replace(".", ",");

/** Spreadsheet of one version for one batch size, with the store and address of every price. */
export function costCsv(version: SuporteVersion, units: number): string {
  const t = costTable(version, units);
  const q = (s: string) => `"${s.replaceAll('"', '""')}"`;
  const head = ["ID", "Item", "Quantidade", "Unidade", "Pacotes", "Preço do pacote (R$)", "Tamanho do pacote", "Material usado (R$)", "Compra (R$)", "Confiança", "Loja", "Endereço", "Observação"];
  const lines = t.rows.map((r) =>
    [r.id, r.label, String(r.need).replace(".", ","), r.unit, String(r.packs), r.packPrice === null ? "" : brl(r.packPrice), r.packLabel, r.used === null ? "" : brl(r.used), r.purchase === null ? "" : brl(r.purchase), r.confidence, r.store, r.url, r.note].map(q).join(";"),
  );
  lines.push(["", "TOTAL", "", "", "", "", "", brl(t.used), brl(t.purchase), "", "", "", t.missing.length ? `sem preço: ${t.missing.join(", ")}` : ""].map(q).join(";"));
  lines.push(["", `POR UNIDADE (${units} un)`, "", "", "", "", "", brl(t.usedPerUnit), brl(t.purchasePerUnit), "", "", "", `preços de ${PRICE_DATE}, varejo, à vista no Pix`].map(q).join(";"));
  return "﻿" + head.map(q).join(";") + "\r\n" + lines.join("\r\n") + "\r\n";
}
