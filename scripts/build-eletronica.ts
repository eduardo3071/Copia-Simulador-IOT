// Schematics, BOM and fabrication files for the light of the pregoscopio.
//   v1: 9 V battery -> switch -> 330 ohm -> white LED
//   v2: DC adapter -> LM317 constant-current regulator with a rheostat for the brightness
// Writes pacote-montagem/eletronica/. Run: npx tsx scripts/build-eletronica.ts
import { createElement as h, type ReactElement } from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { Circuit } from "@tscircuit/core";
import type { AnyCircuitElement } from "circuit-json";
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg";
import { fabricationFiles } from "../packages/adapter-eda/src/index.ts";

const out = new URL("../pacote-montagem/eletronica/", import.meta.url);
mkdirSync(out, { recursive: true });

// ---- numbers (kept here so the guide quotes the same values) ----------------------------
export const V1 = { battery: 9, ledVf: 3.1, resistor: 330 };
export const V1_CURRENT_mA = ((V1.battery - V1.ledVf) / V1.resistor) * 1000;
export const V2 = { vrefLm317: 1.25, fixed: 47, rheostat: 220, supplyV: 12, ledVf: 3.1, dropout: 2 };
export const V2_MAX_mA = (V2.vrefLm317 / V2.fixed) * 1000;
export const V2_MIN_mA = (V2.vrefLm317 / (V2.fixed + V2.rheostat)) * 1000;

type Node = ReactElement;
/** One net: every listed port gets a trace to it (the same pattern the simulator's EDA adapter uses). */
const net = (name: string, ...ports: string[]): Node[] => [h("net", { name }), ...ports.map((port) => h("trace", { from: port, to: `net.${name}` }))];
const header = (name: string, labels: string[], x: number, y = 0): Node =>
  h("pinheader", { name, pinCount: labels.length, footprint: `pinrow${labels.length}`, pinLabels: labels, pcbX: x, pcbY: y });

async function render(name: string, title: string, children: Node[], board = { width: 40, height: 25 }) {
  const circuit = new Circuit();
  circuit.add(h("board", { width: board.width, height: board.height }, ...children));
  await circuit.renderUntilSettled();
  const json = circuit.getCircuitJson() as AnyCircuitElement[];
  const errors = json.filter((e) => e.type.endsWith("_error")).map((e) => `${e.type}: ${String((e as { message?: unknown }).message ?? "")}`);
  mkdirSync(new URL(`${name}/`, out), { recursive: true });
  writeFileSync(new URL(`${name}/esquematico.svg`, out), convertCircuitJsonToSchematicSvg(json));
  const files = await fabricationFiles(json, { title, revision: 1 });
  for (const f of files) {
    const url = new URL(`${name}/${f.path}`, out);
    mkdirSync(new URL("./", url), { recursive: true });
    writeFileSync(url, f.content);
  }
  console.log(`${name}: ${json.length} elementos, ${errors.length} erros${errors.length ? "\n  " + errors.slice(0, 6).join("\n  ") : ""}`);
}

await render("v1-pilha", "Luz do pregoscopio v1 (pilha 9 V)", [
  header("BT1", ["POS", "NEG"], -14),
  header("SW1", ["A", "B"], -4),
  h("resistor", { name: "R1", resistance: V1.resistor, footprint: "axial_p0.4in", pcbX: 6, pcbY: 0, pcbRotation: 90 }),
  header("D1", ["ANODO", "CATODO"], 15),
  ...net("VBAT", ".BT1 > .pin1", ".SW1 > .pin1"),
  ...net("VSW", ".SW1 > .pin2", ".R1 > .pin1"),
  ...net("VLED", ".R1 > .pin2", ".D1 > .pin1"),
  ...net("GND", ".D1 > .pin2", ".BT1 > .pin2"),
]);

await render("v2-fonte-dimmer", "Luz do pregoscopio v2 (fonte + dimmer)", [
  header("J1", ["VIN", "GND"], -22),
  h("chip", { name: "U1", footprint: "to220", pcbX: -8, pcbY: 0, pinLabels: { pin1: "ADJ", pin2: "OUT", pin3: "IN" } }),
  h("resistor", { name: "R1", resistance: V2.fixed, footprint: "axial_p0.4in", pcbX: 8, pcbY: 6, pcbRotation: 90 }),
  h("potentiometer", { name: "RV1", maxResistance: V2.rheostat, footprint: "pinrow3", pinVariant: "three_pin", pcbX: 16, pcbY: 0 }),
  header("D1", ["ANODO", "CATODO"], 26),
  // M3 holes for the standoffs of the light box (53 x 18 mm pattern)
  ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => h("hole", { name: `MH${sx}${sy}`, diameter: 3.2, pcbX: sx * 26.5, pcbY: sy * 9 }))),
  ...net("VIN", ".J1 > .pin1", ".U1 > .pin3"),
  ...net("GND", ".J1 > .pin2", ".D1 > .pin2"),
  ...net("VOUT", ".U1 > .pin2", ".R1 > .pin1"),
  // current-regulator topology: the set resistor (R1 + rheostat) sits between OUT and ADJ, and the LED hangs from ADJ to GND
  ...net("RSET", ".R1 > .pin2", ".RV1 > .pin1"),
  ...net("ADJ", ".RV1 > .pin2", ".RV1 > .pin3", ".U1 > .pin1", ".D1 > .pin1"),
], { width: 60, height: 25 });

console.log(`v1: corrente ${V1_CURRENT_mA.toFixed(1)} mA, resistor ${((V1.battery - V1.ledVf) / 0.02).toFixed(0)} ohm para 20 mA`);
console.log(`v2: corrente de ${V2_MIN_mA.toFixed(1)} a ${V2_MAX_mA.toFixed(1)} mA; entrada minima ${(V2.ledVf + V2.vrefLm317 + V2.dropout).toFixed(1)} V`);
