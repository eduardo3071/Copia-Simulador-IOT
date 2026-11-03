import type { ComponentDefinition } from "./types.ts";

const OWN = "Simulador-IOT (próprio)";
const FOOTPRINTER = "@tscircuit/footprinter";

/** 9 V battery (6F22) with snap clip. Drawn by this project; leads end 28.8 px apart. */
export const battery9v: ComponentDefinition = {
  id: "battery-9v",
  version: 1,
  name: "Bateria 9 V (6F22)",
  category: "power",
  refDesPrefix: "BT",
  size: { width: 70, height: 130 },
  pins: [
    { id: "+", label: "Positivo (+)", x: 20, y: 124, role: "passive", edaPort: "pin1" },
    { id: "-", label: "Negativo (−)", x: 48.8, y: 124, role: "passive", edaPort: "pin2" },
  ],
  params: [{ key: "voltage", label: "Tensão", type: "number", default: 9, unit: "V", min: 1, max: 48 }],
  internalNets: [],
  visual: { kind: "generic", shape: "battery" },
  eda: { kind: "module", footprints: ["pinrow2"] },
  simulation: { model: "source", note: "Fonte ideal: não modela a queda de tensão com a descarga." },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: OWN, footprint: `${FOOTPRINTER} pinrow2 (conector dos fios)`, license: "MIT" },
};

/** Wall adapter with a 5.5 x 2.1 mm plug plus the panel jack (PS1 and J1 of the support, as one source). */
export const dcSupply: ComponentDefinition = {
  id: "dc-supply",
  version: 1,
  name: "Fonte 12 V + conector P4",
  category: "power",
  refDesPrefix: "PS",
  size: { width: 80, height: 100 },
  pins: [
    { id: "+", label: "Positivo (+)", x: 28, y: 94, role: "passive", edaPort: "pin1" },
    { id: "-", label: "Negativo (−)", x: 52, y: 94, role: "passive", edaPort: "pin2" },
  ],
  params: [{ key: "voltage", label: "Tensão", type: "number", default: 12, unit: "V", min: 1, max: 48 }],
  internalNets: [],
  visual: { kind: "generic", shape: "supply" },
  eda: { kind: "module", footprints: ["pinrow2"] },
  simulation: { model: "source", note: "Fonte ideal com centro positivo." },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: OWN, footprint: `${FOOTPRINTER} pinrow2 (conector dos fios)`, license: "MIT" },
};

/** Rocker switch (KCD1-101 style), on/off with two terminals. A click toggles it. */
export const rockerSwitch: ComponentDefinition = {
  id: "rocker-switch",
  version: 1,
  name: "Interruptor de balancim (KCD1)",
  category: "input",
  refDesPrefix: "SW",
  size: { width: 60, height: 74 },
  pins: [
    { id: "1.l", label: "Terminal 1", x: 18, y: 68, role: "passive", edaPort: "pin1" },
    { id: "2.l", label: "Terminal 2", x: 42, y: 68, role: "passive", edaPort: "pin2" },
  ],
  params: [],
  internalNets: [],
  visual: { kind: "generic", shape: "switch" },
  eda: { kind: "module", footprints: ["pinrow2"] },
  simulation: { model: "switch", latching: true },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: OWN, footprint: `${FOOTPRINTER} pinrow2 (conector dos fios)`, license: "MIT" },
};

/** LM317T in TO-220, front view: ADJ, OUT, IN from the left. Legs 9.6 px apart so it also fits the breadboard. */
export const lm317: ComponentDefinition = {
  id: "lm317",
  version: 1,
  name: "LM317T (regulador ajustável)",
  category: "passive",
  refDesPrefix: "U",
  size: { width: 50, height: 74 },
  pins: [
    { id: "ADJ", label: "ADJ", x: 15.4, y: 70, role: "passive", edaPort: "pin1" },
    { id: "OUT", label: "OUT", x: 25, y: 70, role: "passive", edaPort: "pin2" },
    { id: "IN", label: "IN", x: 34.6, y: 70, role: "passive", edaPort: "pin3" },
  ],
  params: [],
  internalNets: [],
  visual: { kind: "generic", shape: "regulator" },
  eda: { kind: "chip", footprints: ["to220"] },
  simulation: {
    model: "regulator",
    note: "Só a topologia de fonte de corrente (LED entre ADJ e GND, resistor entre OUT e ADJ): corrente = 1,25 V / resistência, com queda de 2 V.",
  },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: OWN, footprint: `${FOOTPRINTER} to220 (MIT)`, license: "MIT" },
};
