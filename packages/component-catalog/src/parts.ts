import type { AvrPin, ComponentDefinition, PinDef } from "./types.ts";

/** Wokwi elements are drawn in mm; pin coordinates are already in CSS px. */
const mm = (value: number) => (value * 96) / 25.4;

const WOKWI = "@wokwi/elements 1.9.2 (MIT)";

function digital(n: number, x: number, y: number): PinDef {
  const avr: AvrPin = n < 8 ? { port: "D", bit: n } : { port: "B", bit: n - 8 };
  return { id: String(n), label: `D${n}`, x, y, role: "digital", avr };
}

function analog(n: number, x: number, y: number, id = `A${n}`): PinDef {
  return { id, label: `A${n}`, x, y, role: "analog", avr: { port: "C", bit: n, adcChannel: n } };
}

/** Coordinates copied from ArduinoUnoElement.pinInfo. */
export const arduinoUno: ComponentDefinition = {
  id: "arduino-uno",
  version: 1,
  name: "Arduino Uno R3",
  category: "board",
  refDesPrefix: "U",
  size: { width: mm(72.58), height: mm(53.34) },
  pins: [
    analog(5, 87, 9, "A5.2"),
    analog(4, 97, 9, "A4.2"),
    { id: "AREF", label: "AREF", x: 106, y: 9, role: "passive" },
    { id: "GND.1", label: "GND", x: 115.5, y: 9, role: "ground", voltage: 0 },
    ...[13, 12, 11, 10, 9, 8].map((n, i) => digital(n, [125, 134.5, 144, 153.5, 163, 173][i]!, 9)),
    ...[7, 6, 5, 4, 3, 2, 1, 0].map((n, i) => digital(n, [189, 198.5, 208, 217.5, 227, 236.5, 246, 255.5][i]!, 9)),
    { id: "IOREF", label: "IOREF", x: 131, y: 191.5, role: "power", voltage: 5 },
    { id: "RESET", label: "RESET", x: 140.5, y: 191.5, role: "passive" },
    { id: "3.3V", label: "3.3V", x: 150, y: 191.5, role: "power", voltage: 3.3 },
    { id: "5V", label: "5V", x: 160, y: 191.5, role: "power", voltage: 5 },
    { id: "GND.2", label: "GND", x: 169.5, y: 191.5, role: "ground", voltage: 0 },
    { id: "GND.3", label: "GND", x: 179, y: 191.5, role: "ground", voltage: 0 },
    { id: "VIN", label: "VIN", x: 188.5, y: 191.5, role: "power" },
    ...[0, 1, 2, 3, 4, 5].map((n, i) => analog(n, [208, 217.5, 227, 236.5, 246, 255.5][i]!, 191.5)),
  ],
  params: [],
  internalNets: [
    ["GND.1", "GND.2", "GND.3"],
    ["A4", "A4.2"],
    ["A5", "A5.2"],
  ],
  visual: { kind: "wokwi", tag: "wokwi-arduino-uno" },
  // On the PCB the Uno becomes a pin header (J) carrying only the pins actually used.
  eda: { kind: "connector", footprints: ["pinrow"] },
  simulation: { model: "mcu-avr" },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: "@tscircuit/footprinter pinrowN (MIT)", license: "MIT" },
};

export const resistor: ComponentDefinition = {
  id: "resistor",
  version: 1,
  name: "Resistor",
  category: "passive",
  refDesPrefix: "R",
  size: { width: mm(15.645), height: mm(3) },
  pins: [
    { id: "1", label: "1", x: 0, y: 5.65, role: "passive", edaPort: "pin1" },
    { id: "2", label: "2", x: 58.8, y: 5.65, role: "passive", edaPort: "pin2" },
  ],
  params: [{ key: "resistance", label: "Resistência", type: "number", default: 220, unit: "Ω", min: 1, max: 10_000_000 }],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-resistor" },
  eda: { kind: "resistor", footprints: ["axial_p0.4in", "axial_p0.3in", "0805"] },
  simulation: { model: "resistor" },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: true },
  provenance: { visual: WOKWI, footprint: "@tscircuit/footprinter axial (MIT)", license: "MIT" },
};

export const led: ComponentDefinition = {
  id: "led",
  version: 1,
  name: "LED 5 mm",
  category: "output",
  refDesPrefix: "D",
  size: { width: 40, height: 50 },
  pins: [
    { id: "A", label: "Anodo", x: 25, y: 42, role: "passive", edaPort: "pin1" },
    { id: "C", label: "Catodo", x: 15, y: 42, role: "passive", edaPort: "pin2" },
  ],
  params: [
    {
      key: "color",
      label: "Cor",
      type: "select",
      default: "red",
      options: [
        { value: "red", label: "Vermelho" },
        { value: "green", label: "Verde" },
        { value: "yellow", label: "Amarelo" },
        { value: "blue", label: "Azul" },
        { value: "white", label: "Branco" },
      ],
    },
  ],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-led" },
  // 5 mm THT LED: two holes at 2.54 mm pitch (pin1 = anode).
  eda: { kind: "led", footprints: ["pinrow2", "0805"] },
  simulation: { model: "leds", leds: [{ anode: "A", cathode: "C" }] },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: "@tscircuit/footprinter pinrow2 (MIT)", license: "MIT" },
};

export const pushbutton: ComponentDefinition = {
  id: "pushbutton",
  version: 1,
  name: "Botão (12 mm)",
  category: "input",
  refDesPrefix: "SW",
  size: { width: mm(17.802), height: mm(12) },
  pins: [
    { id: "1.l", label: "1 (esq.)", x: 0, y: 13, role: "passive", edaPort: "pin1" },
    { id: "2.l", label: "2 (esq.)", x: 0, y: 32, role: "passive", edaPort: "pin3" },
    { id: "1.r", label: "1 (dir.)", x: 67, y: 13, role: "passive", edaPort: "pin2" },
    { id: "2.r", label: "2 (dir.)", x: 67, y: 32, role: "passive", edaPort: "pin4" },
  ],
  params: [
    {
      key: "color",
      label: "Cor",
      type: "select",
      default: "red",
      options: [
        { value: "red", label: "Vermelho" },
        { value: "green", label: "Verde" },
        { value: "blue", label: "Azul" },
        { value: "yellow", label: "Amarelo" },
        { value: "black", label: "Preto" },
      ],
    },
  ],
  // Legs with the same number are always connected; pressing joins side 1 and side 2.
  internalNets: [["1.l", "1.r"], ["2.l", "2.r"]],
  visual: { kind: "wokwi", tag: "wokwi-pushbutton" },
  eda: { kind: "pushbutton", footprints: ["pushbutton"] },
  simulation: { model: "switch" },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: "@tscircuit/footprinter pushbutton (MIT)", license: "MIT" },
};

export const potentiometer: ComponentDefinition = {
  id: "potentiometer",
  version: 1,
  name: "Potenciômetro",
  category: "input",
  refDesPrefix: "RV",
  size: { width: mm(20), height: mm(20) },
  pins: [
    { id: "GND", label: "Extremo 1", x: 29, y: 68.5, role: "passive", edaPort: "pin1" },
    { id: "SIG", label: "Cursor", x: 39, y: 68.5, role: "passive", edaPort: "pin2" },
    { id: "VCC", label: "Extremo 2", x: 49, y: 68.5, role: "passive", edaPort: "pin3" },
  ],
  params: [{ key: "resistance", label: "Resistência", type: "number", default: 10_000, unit: "Ω", min: 100, max: 1_000_000 }],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-potentiometer" },
  eda: { kind: "potentiometer", footprints: ["potentiometer"] },
  simulation: { model: "potentiometer" },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: "@tscircuit/footprinter potentiometer (MIT)", license: "MIT" },
};