export type PinRole = "digital" | "analog" | "power" | "ground" | "passive";

export interface AvrPin {
  port: "B" | "C" | "D";
  bit: number;
  adcChannel?: number;
}

export interface PinDef {
  /** Stable pin id. For wokwi parts it equals the element's pin name. */
  id: string;
  label: string;
  /** Breadboard-view position in CSS px, relative to the unrotated part's top-left. */
  x: number;
  y: number;
  role: PinRole;
  /** Port name on the tscircuit component (pin1, pin2, ...); absent = not on the PCB. */
  edaPort?: string;
  /** Microcontroller pin mapping (boards only). */
  avr?: AvrPin;
  /** Nominal voltage for power pins. */
  voltage?: number;
}

export interface ParamDef {
  key: string;
  label: string;
  type: "number" | "select";
  default: string | number;
  unit?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

/**
 * - connector: MCU board, becomes a header with only the used pins
 * - module: off-board module/part, becomes a header with all its pins (pin order = edaPort)
 * - chip: generic part with an explicit footprint and pin labels
 */
export type EdaKind = "resistor" | "led" | "pushbutton" | "potentiometer" | "capacitor" | "chip" | "connector" | "module" | "none";

export type SimulationModel =
  | "mcu-avr"
  | "resistor"
  | "leds"
  | "switch"
  | "potentiometer"
  | "wiring"
  | "buzzer"
  | "servo"
  | "ldr-module"
  | "dht22"
  | "hc-sr04"
  | "lcd1602"
  | "capacitor";

/** One light-emitting junction inside a part (a LED, a segment, a bar). */
export interface LedSegment {
  anode: string;
  cathode: string;
  /** Fixed colour; otherwise the part's "color" parameter. */
  color?: string;
}

/** A quantity of the simulated environment the user can change while running. */
export interface EnvDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** Slider on a logarithmic scale (e.g. illuminance). */
  log?: boolean;
}

export interface Capabilities {
  /** Has a breadboard visual. */
  drawable: boolean;
  /** Has a behavioural model in the lab (logic-level, not SPICE). */
  simulable: boolean;
  /** Has a verified footprint + pin/pad mapping. */
  fabricable: boolean;
  /** Has a 3D model in the PCB view. */
  model3d: boolean;
}

export interface ComponentDefinition {
  id: string;
  version: number;
  name: string;
  category: "board" | "passive" | "output" | "input" | "prototyping";
  refDesPrefix: string;
  /** Breadboard-view size in CSS px (unrotated). */
  size: { width: number; height: number };
  pins: PinDef[];
  params: ParamDef[];
  /** Groups of pins connected inside the part (breadboard strips, button legs). */
  internalNets: string[][];
  visual: { kind: "wokwi"; tag: string } | { kind: "breadboard" } | { kind: "capacitor" };
  eda: { kind: EdaKind; footprints: string[] };
  simulation: { model: SimulationModel; leds?: LedSegment[]; env?: EnvDef[]; note?: string };
  capabilities: Capabilities;
  provenance: { visual: string; footprint: string; license: string };
}