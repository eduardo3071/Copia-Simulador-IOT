import type { ComponentDefinition, PinDef } from "./types.ts";

const mm = (value: number) => (value * 96) / 25.4;
const WOKWI = "@wokwi/elements 1.9.2 (MIT)";
const FOOTPRINTER = "@tscircuit/footprinter (ISC)";

const passive = (id: string, label: string, x: number, y: number, edaPort: string): PinDef => ({ id, label, x, y, role: "passive", edaPort });
const COLORS = [
  { value: "red", label: "Vermelho" },
  { value: "green", label: "Verde" },
  { value: "yellow", label: "Amarelo" },
  { value: "blue", label: "Azul" },
  { value: "white", label: "Branco" },
];

/** 5 mm RGB LED, common cathode (pin order R, COM, G, B as on the usual part). */
export const rgbLed: ComponentDefinition = {
  id: "rgb-led",
  version: 1,
  name: "LED RGB (catodo comum)",
  category: "output",
  refDesPrefix: "D",
  size: { width: 42.13, height: 72.58 },
  pins: [
    passive("R", "Vermelho", 8.5, 44, "pin1"),
    passive("COM", "Comum (catodo)", 18, 54, "pin2"),
    passive("G", "Verde", 26.4, 44, "pin3"),
    passive("B", "Azul", 35.7, 44, "pin4"),
  ],
  params: [],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-rgb-led" },
  eda: { kind: "chip", footprints: ["pinrow4"] },
  simulation: {
    model: "leds",
    leds: [
      { anode: "R", cathode: "COM", color: "red" },
      { anode: "G", cathode: "COM", color: "green" },
      { anode: "B", cathode: "COM", color: "blue" },
    ],
  },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} pinrow4`, license: "MIT" },
};

/** Piezo buzzer: pin 1 = negative, pin 2 = positive (12 mm body, 7.62 mm lead pitch). */
export const buzzer: ComponentDefinition = {
  id: "buzzer",
  version: 1,
  name: "Buzzer",
  category: "output",
  refDesPrefix: "BZ",
  size: { width: mm(17), height: mm(20) },
  pins: [passive("1", "− (1)", 27, 84, "pin1"), passive("2", "+ (2)", 37, 84, "pin2")],
  params: [],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-buzzer" },
  eda: { kind: "chip", footprints: ["pinrow2_p7.62mm"] },
  simulation: { model: "buzzer", note: "Ativo quando + está acima de −; a frequência vem da comutação do pino que o aciona." },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} pinrow2_p7.62mm`, license: "MIT" },
};

/** 0.56" single-digit display, common cathode; pin numbers follow the usual 10-pin part. */
const SEGMENT_PINS: [string, number, number, number][] = [
  ["COM.1", 23.72, 71.82, 3],
  ["COM.2", 23.72, 3.78, 8],
  ["A", 33.32, 3.78, 7],
  ["B", 42.92, 3.78, 6],
  ["C", 33.32, 71.82, 4],
  ["D", 14.12, 71.82, 2],
  ["E", 4.52, 71.82, 1],
  ["F", 14.12, 3.78, 9],
  ["G", 4.52, 3.78, 10],
  ["DP", 42.92, 71.82, 5],
];

export const sevenSegment: ComponentDefinition = {
  id: "7segment",
  version: 1,
  name: "Display 7 segmentos (catodo comum)",
  category: "output",
  refDesPrefix: "DS",
  size: { width: 47.42, height: 83.14 },
  pins: SEGMENT_PINS.map(([id, x, y, n]) => passive(id, id.startsWith("COM") ? "Comum" : `Seg. ${id}`, x, y, `pin${n}`)),
  params: [{ key: "color", label: "Cor", type: "select", default: "red", options: COLORS }],
  internalNets: [["COM.1", "COM.2"]],
  visual: { kind: "wokwi", tag: "wokwi-7segment" },
  eda: { kind: "chip", footprints: ["dip10_w15.24mm"] },
  // segment order matches the element's `values` array: A B C D E F G DP
  simulation: { model: "leds", leds: ["A", "B", "C", "D", "E", "F", "G", "DP"].map((s) => ({ anode: s, cathode: "COM.1" })) },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} dip10_w15.24mm`, license: "MIT" },
};

const BAR_Y = [4.8, 14.4, 24, 33.6, 43.21, 52.81, 62.41, 72.01, 81.61, 91.21];

export const ledBarGraph: ComponentDefinition = {
  id: "led-bar-graph",
  version: 1,
  name: "Barra de 10 LEDs",
  category: "output",
  refDesPrefix: "BAR",
  size: { width: 38.16, height: 96.38 },
  pins: [
    ...BAR_Y.map((y, i) => passive(`A${i + 1}`, `Anodo ${i + 1}`, 4.8, y, `pin${i + 1}`)),
    ...BAR_Y.map((y, i) => passive(`C${i + 1}`, `Catodo ${i + 1}`, 33.38, y, `pin${20 - i}`)),
  ],
  params: [
    {
      key: "color",
      label: "Cor",
      type: "select",
      default: "red",
      options: [...COLORS, { value: "GYR", label: "Verde/amarelo/vermelho" }, { value: "BCYR", label: "Azul/ciano/amarelo/vermelho" }],
    },
  ],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-led-bar-graph" },
  eda: { kind: "chip", footprints: ["dip20_w7.62mm"] },
  simulation: { model: "leds", leds: BAR_Y.map((_, i) => ({ anode: `A${i + 1}`, cathode: `C${i + 1}`, color: "red" })) },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} dip20_w7.62mm`, license: "MIT" },
};

export const servo: ComponentDefinition = {
  id: "servo",
  version: 1,
  name: "Servo motor (SG90)",
  category: "output",
  refDesPrefix: "M",
  size: { width: 170.07, height: 119.54 },
  pins: [
    { id: "GND", label: "GND (marrom)", x: 0, y: 50, role: "passive", edaPort: "pin1" },
    { id: "V+", label: "V+ (vermelho)", x: 0, y: 59.5, role: "passive", edaPort: "pin2" },
    { id: "PWM", label: "Sinal (laranja)", x: 0, y: 69, role: "passive", edaPort: "pin3" },
  ],
  params: [],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-servo" },
  // off-board part: the PCB gets the 3-pin header its cable plugs into
  eda: { kind: "module", footprints: ["pinrow3"] },
  simulation: { model: "servo", note: "Ângulo pela largura do pulso: 544 µs = 0°, 2400 µs = 180° (padrão da biblioteca Servo)." },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} pinrow3 (conector)`, license: "MIT" },
};

const LCD_PINS = ["VSS", "VDD", "V0", "RS", "RW", "E", "D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "A", "K"];
const LCD_X = [32, 41.5, 51.5, 60.5, 70.5, 80, 89.5, 99.5, 109, 118.5, 128, 137.5, 147, 156.5, 166.5, 176];

/** HD44780-compatible 16x2 module, parallel interface (LiquidCrystal library). */
export const lcd1602: ComponentDefinition = {
  id: "lcd1602",
  version: 1,
  name: "LCD 16x2 (HD44780, paralelo)",
  category: "output",
  refDesPrefix: "LCD",
  size: { width: 302.35, height: 136.06 },
  pins: LCD_PINS.map((id, i) => ({ id, label: id, x: LCD_X[i]!, y: 130.97, role: "passive" as const, edaPort: `pin${i + 1}` })),
  params: [],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-lcd1602" },
  eda: { kind: "module", footprints: ["pinrow16"] },
  simulation: {
    model: "lcd1602",
    note: "Emula o protocolo HD44780 (modo 4 e 8 bits, comandos de texto e cursor). Caracteres personalizados (CGRAM) não são desenhados.",
  },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} pinrow16 (conector)`, license: "MIT" },
};

export const dht22: ComponentDefinition = {
  id: "dht22",
  version: 1,
  name: "Sensor DHT22 (temperatura e umidade)",
  category: "input",
  refDesPrefix: "U",
  size: { width: 57.06, height: 116.72 },
  pins: [
    passive("VCC", "VCC", 15, 114.9, "pin1"),
    passive("SDA", "Dados", 24.5, 114.9, "pin2"),
    passive("NC", "NC", 34.1, 114.9, "pin3"),
    passive("GND", "GND", 43.8, 114.9, "pin4"),
  ],
  params: [],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-dht22" },
  eda: { kind: "chip", footprints: ["pinrow4"] },
  simulation: {
    model: "dht22",
    note: "Emula o protocolo de 1 fio do DHT22 (início, resposta e 40 bits com checksum).",
    env: [
      { key: "temperature", label: "Temperatura", unit: "°C", min: -40, max: 80, step: 0.1, default: 24 },
      { key: "humidity", label: "Umidade", unit: "%", min: 0, max: 100, step: 0.1, default: 40 },
    ],
  },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} pinrow4`, license: "MIT" },
};

export const hcsr04: ComponentDefinition = {
  id: "hc-sr04",
  version: 1,
  name: "Sensor ultrassônico HC-SR04",
  category: "input",
  refDesPrefix: "U",
  size: { width: 170.07, height: 94.49 },
  pins: [
    passive("VCC", "VCC", 71.3, 94.5, "pin1"),
    passive("TRIG", "Trigger", 81.3, 94.5, "pin2"),
    passive("ECHO", "Echo", 91.3, 94.5, "pin3"),
    passive("GND", "GND", 101.3, 94.5, "pin4"),
  ],
  params: [],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-hc-sr04" },
  eda: { kind: "module", footprints: ["pinrow4"] },
  simulation: {
    model: "hc-sr04",
    note: "Pulso em TRIG ≥ 10 µs gera em ECHO um pulso de 58 µs por centímetro (som a 343 m/s).",
    env: [{ key: "distance", label: "Distância", unit: "cm", min: 2, max: 400, step: 1, default: 100 }],
  },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} pinrow4 (conector)`, license: "MIT" },
};

/** LDR + 10 kΩ divider + comparator module (AO analog, DO digital). */
export const ldrModule: ComponentDefinition = {
  id: "ldr-module",
  version: 1,
  name: "Módulo sensor de luz (LDR)",
  category: "input",
  refDesPrefix: "U",
  size: { width: 173.66, height: 61.48 },
  pins: [
    passive("VCC", "VCC", 172, 16, "pin1"),
    passive("GND", "GND", 172, 26, "pin2"),
    passive("DO", "Saída digital", 172, 35.8, "pin3"),
    passive("AO", "Saída analógica", 172, 45.5, "pin4"),
  ],
  params: [],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-photoresistor-sensor" },
  eda: { kind: "module", footprints: ["pinrow4"] },
  simulation: {
    model: "ldr-module",
    note: "R_LDR = 50 kΩ·(lux/10)^-0,7; AO = VCC·R_LDR/(R_LDR+10 kΩ); DO alto (escuro) quando AO > VCC/2.",
    env: [{ key: "lux", label: "Iluminância", unit: "lx", min: 0.1, max: 100000, step: 0.1, default: 500, log: true }],
  },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} pinrow4 (conector)`, license: "MIT" },
};

export const slidePotentiometer: ComponentDefinition = {
  id: "slide-potentiometer",
  version: 1,
  name: "Potenciômetro deslizante",
  category: "input",
  refDesPrefix: "RV",
  size: { width: 207.86, height: 109.6 },
  pins: [
    { id: "VCC", label: "Extremo 2", x: 1, y: 43, role: "passive", edaPort: "pin1" },
    { id: "SIG", label: "Cursor", x: 1, y: 63, role: "passive", edaPort: "pin2" },
    { id: "GND", label: "Extremo 1", x: 207, y: 43, role: "passive", edaPort: "pin3" },
  ],
  params: [{ key: "resistance", label: "Resistência", type: "number", default: 10_000, unit: "Ω", min: 100, max: 1_000_000 }],
  internalNets: [],
  visual: { kind: "wokwi", tag: "wokwi-slide-potentiometer" },
  eda: { kind: "module", footprints: ["pinrow3"] },
  simulation: { model: "potentiometer" },
  capabilities: { drawable: true, simulable: true, fabricable: true, model3d: false },
  provenance: { visual: WOKWI, footprint: `${FOOTPRINTER} pinrow3 (conector)`, license: "MIT" },
};

/** Ceramic capacitor, 2.54 mm lead pitch. Drawn by this project. */
export const capacitor: ComponentDefinition = {
  id: "capacitor",
  version: 1,
  name: "Capacitor cerâmico",
  category: "passive",
  refDesPrefix: "C",
  size: { width: 30, height: 40 },
  pins: [passive("1", "1", 10.2, 36, "pin1"), passive("2", "2", 19.8, 36, "pin2")],
  params: [{ key: "capacitance", label: "Capacitância", type: "number", default: 100, unit: "nF", min: 0.001, max: 1_000_000 }],
  internalNets: [],
  visual: { kind: "capacitor" },
  eda: { kind: "capacitor", footprints: ["pinrow2", "pinrow2_p5.08mm", "0805"] },
  simulation: { model: "capacitor", note: "Em DC o capacitor é um circuito aberto; carga e descarga no tempo exigem a simulação elétrica (fase 3)." },
  capabilities: { drawable: true, simulable: false, fabricable: true, model3d: false },
  provenance: { visual: "Simulador-IOT (próprio)", footprint: `${FOOTPRINTER} pinrow2`, license: "MIT" },
};