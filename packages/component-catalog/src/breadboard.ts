import type { ComponentDefinition, PinDef } from "./types.ts";

/** Hole pitch: 0.1 in at 96 dpi. */
export const PITCH = 9.6;
export const BREADBOARD_COLUMNS = 30;
export const MAIN_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;

/** Row positions in pitch units, from the top edge. */
const ROW_Y: Record<string, number> = {
  tn: 1, tp: 2,
  a: 4, b: 5, c: 6, d: 7, e: 8,
  f: 10, g: 11, h: 12, i: 13, j: 14,
  bp: 16, bn: 17,
};

export const RAILS = [
  { id: "tn", label: "−", role: "ground" },
  { id: "tp", label: "+", role: "power" },
  { id: "bp", label: "+", role: "power" },
  { id: "bn", label: "−", role: "ground" },
] as const;

const columnX = (col: number) => (col + 0.5) * PITCH;
/** Rails have 25 holes: groups of five with a gap every sixth column. */
export const railHasHole = (col: number) => (col - 1) % 6 !== 5;

function buildPins(): PinDef[] {
  const pins: PinDef[] = [];
  for (const rail of RAILS) {
    for (let col = 1; col <= BREADBOARD_COLUMNS; col++) {
      if (!railHasHole(col)) continue;
      pins.push({
        id: `${rail.id}.${col}`,
        label: `${rail.label}${col}`,
        x: columnX(col),
        y: ROW_Y[rail.id]! * PITCH,
        role: "passive",
      });
    }
  }
  for (let col = 1; col <= BREADBOARD_COLUMNS; col++) {
    for (const row of MAIN_ROWS) {
      pins.push({ id: `${col}${row}`, label: `${col}${row}`, x: columnX(col), y: ROW_Y[row]! * PITCH, role: "passive" });
    }
  }
  return pins;
}

function buildInternalNets(): string[][] {
  const nets: string[][] = [];
  for (let col = 1; col <= BREADBOARD_COLUMNS; col++) {
    nets.push(["a", "b", "c", "d", "e"].map((r) => `${col}${r}`));
    nets.push(["f", "g", "h", "i", "j"].map((r) => `${col}${r}`));
  }
  for (const rail of RAILS) {
    const holes: string[] = [];
    for (let col = 1; col <= BREADBOARD_COLUMNS; col++) if (railHasHole(col)) holes.push(`${rail.id}.${col}`);
    nets.push(holes);
  }
  return nets;
}

export const breadboardHalf: ComponentDefinition = {
  id: "breadboard-half",
  version: 1,
  name: "Protoboard (meia)",
  category: "prototyping",
  refDesPrefix: "BB",
  size: { width: (BREADBOARD_COLUMNS + 1.5) * PITCH, height: 18 * PITCH },
  pins: buildPins(),
  params: [],
  internalNets: buildInternalNets(),
  visual: { kind: "breadboard" },
  // Prototyping aid only: its strips become plain nets on the schematic/PCB.
  eda: { kind: "none", footprints: [] },
  simulation: { model: "wiring" },
  capabilities: { drawable: true, simulable: true, fabricable: false, model3d: false },
  provenance: { visual: "Simulador-IOT (próprio)", footprint: "n/a", license: "MIT" },
};