// Schematics, BOM and fabrication files for the light of the pregoscopio.
//   v1: 9 V battery -> switch -> LM317 constant-current source (R1 = 68 ohm) -> white LED, 100 nF at the LM317 input
//   v2: DC adapter -> 1N5819 (reverse polarity) -> switch -> same LM317 stage, R1 + a 220 ohm rheostat for the brightness
// Writes pacote-montagem/eletronica/. Run: npx tsx scripts/build-eletronica.ts
import { createElement as h, type ReactElement } from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { Circuit } from "@tscircuit/core";
import type { AnyCircuitElement } from "circuit-json";
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg";
import { fabricationFiles } from "../packages/adapter-eda/src/index.ts";
import { R1_OHMS, RHEOSTAT_OHMS, v1Light, v2Light } from "../packages/adapter-cad/src/suporte-calc.ts";

const out = new URL("../pacote-montagem/eletronica/", import.meta.url);
mkdirSync(out, { recursive: true });

type Node = ReactElement;
/** tscircuit packs the parts by default (AUTOPACK=0 uses the hand-placed positions, which overlap). */
const AUTOPACK = process.env.AUTOPACK !== "0";
const pos = (x: number, y: number) => (AUTOPACK ? {} : { pcbX: x, pcbY: y });
/** One net: every listed port gets a trace to it (the same pattern the simulator's EDA adapter uses). */
const net = (name: string, ...ports: string[]): Node[] => [h("net", { name }), ...ports.map((port) => h("trace", { from: port, to: `net.${name}` }))];
const header = (name: string, labels: string[], x: number, y = 0): Node =>
  h("pinheader", { name, pinCount: labels.length, footprint: `pinrow${labels.length}`, pinLabels: labels, ...pos(x, y) });
/**
 * Orientation mark on the silkscreen: an arrow pointing to the front wall of the box (-y in the drawings) and the word FRENTE / FRONT.
 * `x` is the left edge region of the board.
 */
const front = (x: number): Node[] => [
  h("silkscreentext", { text: "FRENTE / FRONT", pcbX: x - 1.6, pcbY: 0, pcbRotation: 90, fontSize: 1.1 }),
  h("silkscreenpath", { route: [{ x, y: 6 }, { x, y: -6 }, { x: x - 1, y: -4.2 }, { x, y: -6 }, { x: x + 1, y: -4.2 }] }),
];
const holes = (width: number, depth: number, inset = 3.5): Node[] =>
  [-1, 1].flatMap((sx) => [-1, 1].map((sy) => h("hole", { name: `MH${sx}${sy}`, diameter: 3.2, pcbX: (sx * (width - 2 * inset)) / 2, pcbY: (sy * (depth - 2 * inset)) / 2 })));
// the LM317 and C1 keep fixed positions; the rest is packed by tscircuit (the packer alone puts C1 on top of U1 on the 70 mm board)
const lm317 = (x: number, y: number): Node => h("chip", { name: "U1", footprint: "to220", pcbX: x, pcbY: y, pinLabels: { pin1: "ADJ", pin2: "OUT", pin3: "IN" } });
const capacitor = (x: number, y: number): Node => h("capacitor", { name: "C1", capacitance: "100nF", footprint: "pinrow2_p5.08mm", pcbX: x, pcbY: y });

async function render(name: string, title: string, children: Node[], board: { width: number; height: number }) {
  const circuit = new Circuit();
  circuit.add(h("board", { width: board.width, height: board.height, ...(AUTOPACK ? { pcbPack: true } : {}) }, ...children));
  await circuit.renderUntilSettled();
  const json = circuit.getCircuitJson() as AnyCircuitElement[];
  const errors = json.filter((e) => e.type.endsWith("_error")).map((e) => `${e.type}: ${String((e as { message?: unknown }).message ?? "")}`);
  mkdirSync(new URL(`${name}/`, out), { recursive: true });
  writeFileSync(new URL(`${name}/esquematico.svg`, out), convertCircuitJsonToSchematicSvg(json));
  const files = await fabricationFiles(json, { title, revision: 3 });
  for (const f of files) {
    const url = new URL(`${name}/${f.path}`, out);
    mkdirSync(new URL("./", url), { recursive: true });
    writeFileSync(url, f.content);
  }
  console.log(`${name}: ${json.length} elementos, ${errors.length} erros${errors.length ? "\n  " + errors.slice(0, 8).join("\n  ") : ""}`);
  return errors.length;
}

const results = [
  await render("v1-pilha", "Luz do pregoscopio v1 (pilha 9 V)", [
    header("BT1", ["POS", "NEG"], -12, -8),
    header("SW1", ["A", "B"], -12, 8),
    lm317(0, -7),
    capacitor(0, 7),
    h("resistor", { name: "R1", resistance: R1_OHMS, footprint: "axial_p0.4in", ...pos(7, 2), pcbRotation: 90 }),
    header("D1", ["ANODO", "CATODO"], 12, -8),
    ...holes(40, 25),
    ...front(-17.2),
    ...net("VBAT", ".BT1 > .pin1", ".SW1 > .pin1"),
    ...net("VIN", ".SW1 > .pin2", ".U1 > .pin3", ".C1 > .pin1"),
    ...net("VOUT", ".U1 > .pin2", ".R1 > .pin1"),
    // constant-current topology: the set resistor sits between OUT and ADJ and the LED hangs from ADJ to GND
    ...net("ADJ", ".R1 > .pin2", ".U1 > .pin1", ".D1 > .pin1"),
    ...net("GND", ".D1 > .pin2", ".BT1 > .pin2", ".C1 > .pin2"),
  ], { width: 40, height: 25 }),

  await render("v2-fonte-dimmer", "Luz do pregoscopio v2 (fonte + dimmer)", [
    header("J1", ["VIN", "GND"], -24, -8),
    h("diode", { name: "D2", footprint: "axial_p0.4in", ...pos(-12, -8) }),
    header("SW1", ["A", "B"], -24, 8),
    lm317(-12, 5),
    capacitor(0, -8),
    h("resistor", { name: "R1", resistance: R1_OHMS, footprint: "axial_p0.4in", ...pos(3, -1), pcbRotation: 90 }),
    h("potentiometer", { name: "RV1", maxResistance: RHEOSTAT_OHMS, footprint: "pinrow3", pinVariant: "three_pin", ...pos(14, -7) }),
    header("D1", ["ANODO", "CATODO"], 24, 4),
    ...holes(70, 25),
    ...front(-32.4),
    ...net("VJ1", ".J1 > .pin1", ".D2 > .pin1"),
    ...net("VD", ".D2 > .pin2", ".SW1 > .pin1"),
    ...net("VIN", ".SW1 > .pin2", ".U1 > .pin3", ".C1 > .pin1"),
    ...net("VOUT", ".U1 > .pin2", ".R1 > .pin1"),
    ...net("RSET", ".R1 > .pin2", ".RV1 > .pin1"),
    ...net("ADJ", ".RV1 > .pin2", ".RV1 > .pin3", ".U1 > .pin1", ".D1 > .pin1"),
    ...net("GND", ".J1 > .pin2", ".D1 > .pin2", ".C1 > .pin2"),
  ], { width: 70, height: 25 }),
];

const a = v1Light(9);
const hi = v2Light(12, R1_OHMS, 0);
const lo = v2Light(12, R1_OHMS, RHEOSTAT_OHMS);
console.log(`v1: ${a.currentmA.toFixed(1)} mA constantes de 9 V até ${a.minInputV.toFixed(2)} V; ${a.hours.toFixed(0)} h`);
console.log(`v2: ${lo.currentmA.toFixed(1)} a ${hi.currentmA.toFixed(1)} mA; fonte mínima ${hi.minInputV.toFixed(2)} V`);
if (results.some((n) => n > 0)) process.exitCode = 1;
