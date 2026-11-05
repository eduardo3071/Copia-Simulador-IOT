/**
 * Simulated electrical test of the light: the multimeter readings of every point of testPlan(), computed from real part
 * values (LM317 datasheet limits, LED forward voltage, resistor tolerance, battery and adapter sag) with an optional fault.
 *
 * Part ranges: LM317 reference 1.2 to 1.3 V (typ. 1.25), adjust current 50 uA typ. (100 uA max), minimum load 3.5 mA typ.
 * (5 or 10 mA max, depending on the maker); white 5 mm LED 2.8 to 3.4 V at 20 mA; 6F22 alkaline about 3 ohm at 1 kHz;
 * WH148 rheostat tolerance about 20 %. See docs/pesquisa-pecas.md.
 */
import { DIODE_DROP_V, LM317_DROPOUT, LM317_VREF, LED_VF, R1_OHMS, RHEOSTAT_OHMS, testPlan, type TestRow } from "./suporte-calc.ts";

export type SimVersion = "v1" | "v2";

export type FaultId = "nenhuma" | "led-invertido" | "led-aberto" | "r1-aberto" | "chave-aberta" | "diodo-invertido" | "rv1-aberto";

export const FAULT_LABEL: Record<FaultId, string> = {
  nenhuma: "Nenhum: montagem correta",
  "led-invertido": "LED soldado ao contrário",
  "led-aberto": "Solda fria no LED (circuito aberto)",
  "r1-aberto": "R1 sem contato (solda fria)",
  "chave-aberta": "Interruptor sem contato",
  "diodo-invertido": "D2 (1N5819) ao contrário",
  "rv1-aberto": "Reostato RV1 sem contato",
};

export function faultsFor(version: SimVersion): FaultId[] {
  return version === "v1"
    ? ["nenhuma", "led-invertido", "led-aberto", "r1-aberto", "chave-aberta"]
    : ["nenhuma", "led-invertido", "led-aberto", "r1-aberto", "chave-aberta", "diodo-invertido", "rv1-aberto"];
}

export interface SimParts {
  /** LM317 reference between OUT and ADJ (V). */
  vref: number;
  /** Forward voltage of the LED at 20 mA (V). */
  vf20: number;
  /** Real value of R1 (ohm). */
  r1: number;
  /** Real total resistance of the rheostat (ohm). */
  rv1: number;
  /** Adjust-pin current (A). */
  iadj: number;
  /** Forward drop of D2 at 20 mA (V). */
  vd20: number;
}

export const NOMINAL_PARTS: SimParts = { vref: LM317_VREF, vf20: LED_VF, r1: R1_OHMS, rv1: RHEOSTAT_OHMS, iadj: 50e-6, vd20: DIODE_DROP_V };

/** Spread of the real parts: R1 is 1 % metal film; the others come from the datasheets. */
export const PART_SPREAD = {
  vref: [1.2, 1.3],
  vf20: [2.8, 3.4],
  r1: [R1_OHMS * 0.99, R1_OHMS * 1.01],
  rv1: [RHEOSTAT_OHMS * 0.8, RHEOSTAT_OHMS * 1.2],
  iadj: [30e-6, 100e-6],
  vd20: [0.25, 0.5],
} as const;

export interface Supply {
  label: string;
  /** Open-circuit voltage (V). */
  openV: number;
  /** Internal resistance (ohm). */
  rint: number;
}

export const SUPPLIES: Record<SimVersion, Supply[]> = {
  v1: [
    { label: "Pilha alcalina nova", openV: 9.4, rint: 3 },
    { label: "Pilha com metade da carga", openV: 8.4, rint: 8 },
    { label: "Pilha fraca", openV: 6.8, rint: 25 },
    { label: "Pilha quase morta", openV: 5.8, rint: 40 },
  ],
  v2: [
    { label: "Fonte chaveada de 12 V", openV: 12.2, rint: 0.5 },
    { label: "Fonte de 12 V sem regulação (vazia lê mais)", openV: 14, rint: 4 },
    { label: "Fonte fraca de 9 V (errada)", openV: 9.2, rint: 4 },
    { label: "Fonte de 5 V (errada)", openV: 5.1, rint: 1 },
  ],
};

const LED_N_VT = 0.09;
const LED_RS = 4;

/** Forward voltage of the white LED at current i (A): exponential around the 20 mA point plus a little series resistance. */
export function ledVoltage(i: number, vf20: number): number {
  return vf20 + LED_N_VT * Math.log(Math.max(i, 1e-9) / 0.02) + LED_RS * (i - 0.02);
}

export interface SimInput {
  version: SimVersion;
  parts: SimParts;
  supply: Supply;
  fault: FaultId;
  /** Rheostat position in ohm (v2); 0 is the brightest. */
  pot: number;
}

export interface Nodes {
  /** Source terminals (battery or jack). */
  source: number;
  /** After D2 (v2 only). */
  afterD2: number;
  /** Regulator input, after the switch. */
  vin: number;
  vout: number;
  /** LED anode and ADJ pin. */
  vadj: number;
  /** Across the set resistors (R1 or R1 + RV1). */
  vset: number;
  /** LED current (A). */
  iled: number;
  regulating: boolean;
  /** Current through R1 (and RV1) into the LED node (A). */
  iset: number;
}

const diodeDrop = (i: number, vd20: number) => Math.max(0.05, vd20 + 0.05 * Math.log(Math.max(i, 1e-9) / 0.02));

export function solveCircuit(inp: SimInput): Nodes {
  const { version, parts: p, supply, fault } = inp;
  const rv = version === "v2" ? inp.pot : 0;
  const setOpen = fault === "r1-aberto" || (version === "v2" && fault === "rv1-aberto");
  const rset = p.r1 + rv;
  const ledOpen = fault === "led-aberto" || fault === "led-invertido";
  const dioReversed = version === "v2" && fault === "diodo-invertido";
  const switchOpen = fault === "chave-aberta";

  let i = 0.018;
  let vin = supply.openV;
  let afterD2 = supply.openV;
  let vout = 0;
  let vadj = 0;
  let iset = 0;
  let regulating = false;
  for (let k = 0; k < 30; k++) {
    const draw = switchOpen || dioReversed ? 0 : i;
    const source = supply.openV - draw * supply.rint;
    afterD2 = version === "v2" ? (dioReversed ? 0 : source - diodeDrop(draw, p.vd20)) : source;
    vin = switchOpen || dioReversed ? 0 : afterD2;
    if (vin <= 0.01) {
      vout = 0;
      vadj = 0;
      iset = 0;
      i = 0;
      regulating = false;
      continue;
    }
    if (ledOpen || setOpen) {
      // nothing to regulate: the output rises to near the input; the ADJ node floats with the LED path at only the adjust current
      vout = vin - 1.8;
      iset = 0;
      if (setOpen && !ledOpen) {
        i = p.iadj;
        vadj = ledVoltage(i, p.vf20);
      } else {
        i = 0;
        vadj = vout - 0.05;
      }
      regulating = false;
      continue;
    }
    // regulated current, then limited by the dropout of the regulator
    const regulated = p.vref / rset;
    const headroom = vin - LM317_DROPOUT;
    let iLoad = regulated;
    if (headroom < p.vref + ledVoltage(regulated + p.iadj, p.vf20)) {
      let lo = 0;
      let hi = regulated;
      for (let b = 0; b < 40; b++) {
        const mid = (lo + hi) / 2;
        if (mid * rset + ledVoltage(mid + p.iadj, p.vf20) > headroom) hi = mid;
        else lo = mid;
      }
      iLoad = lo;
      regulating = false;
    } else regulating = true;
    iset = iLoad;
    i = iLoad + p.iadj;
    vadj = ledVoltage(i, p.vf20);
    vout = vadj + iset * rset;
  }
  const i0 = i;
  return { source: supply.openV - (switchOpen || dioReversed ? 0 : i0) * supply.rint, afterD2, vin, vout, vadj, vset: vout - vadj, iled: i0, regulating, iset };
}

export interface Reading {
  row: TestRow;
  /** What the multimeter shows (number in V or mA). */
  value: number;
  /** Display, with the decimals of a hobby multimeter. */
  text: string;
  ok: boolean;
  /** The range the reading was judged against. */
  low: number;
  high: number;
}

const fmt = (v: number, unit: string) => `${v.toFixed(unit === "V" ? 2 : 1).replace(".", ",")} ${unit}`;

/** Readings in the order of testPlan(version). Rows that depend on the supply are judged against the supply that was measured first. */
export function runTest(inp: SimInput): Reading[] {
  const plan = testPlan(inp.version);
  const bright = solveCircuit({ ...inp, pot: 0 });
  const dim = solveCircuit({ ...inp, pot: inp.parts.rv1 });
  const n = solveCircuit({ ...inp, pot: 0 });
  const values: number[] =
    inp.version === "v1"
      ? [n.source, n.vin, n.vout, n.vadj, n.vset, n.iled * 1000]
      : [inp.supply.openV, n.afterD2, n.vin, n.vout, n.vadj, n.vset, bright.iled * 1000, dim.iled * 1000];
  const ranges = plan.map((r) => ({ low: r.low, high: r.high }));
  // the supply readings define what the following points should show
  if (inp.version === "v1") {
    ranges[1] = { low: values[0]! - 0.3, high: values[0]! + 0.02 };
  } else {
    ranges[1] = { low: values[0]! - 0.65, high: values[0]! };
    ranges[2] = { low: values[1]! - 0.2, high: values[1]! + 0.02 };
  }
  return plan.map((row, k) => {
    const value = Math.max(values[k]!, 0);
    const { low, high } = ranges[k]!;
    // a multimeter reads to 0.01 V or 0.1 mA
    const shown = Number(value.toFixed(row.unit === "V" ? 2 : 1));
    return { row, value: shown, text: fmt(shown, row.unit), ok: shown >= low - 1e-9 && shown <= high + 1e-9, low, high };
  });
}

/** A random set of parts inside the spread above, from a seed (so a test can repeat). */
export function randomParts(rand: () => number): SimParts {
  const pick = ([a, b]: readonly [number, number]) => a + (b - a) * rand();
  return { vref: pick(PART_SPREAD.vref), vf20: pick(PART_SPREAD.vf20), r1: pick(PART_SPREAD.r1), rv1: pick(PART_SPREAD.rv1), iadj: pick(PART_SPREAD.iadj), vd20: pick(PART_SPREAD.vd20) };
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

/** First reading outside its range, with the hint of the plan: where to look. */
export function firstFailure(readings: Reading[]): Reading | null {
  return readings.find((r) => !r.ok) ?? null;
}

/** Minimum load the LM317 needs: typical 3.5 mA, guaranteed up to 5 mA (ST) or 10 mA (TI) depending on the maker. */
export const LM317_MIN_LOAD = { typical: 3.5, maxST: 5, maxTI: 10 } as const;
