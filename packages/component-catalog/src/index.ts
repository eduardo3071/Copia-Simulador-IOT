import { breadboardHalf } from "./breadboard.ts";
import { battery9v, dcSupply, lm317, rockerSwitch } from "./parts-power.ts";
import { arduinoUno, led, potentiometer, pushbutton, resistor } from "./parts.ts";
import { buzzer, capacitor, dht22, hcsr04, lcd1602, ldrModule, ledBarGraph, rgbLed, servo, sevenSegment, slidePotentiometer } from "./parts-extra.ts";
import type { ComponentDefinition, PinDef } from "./types.ts";

export * from "./types.ts";
export * from "./geometry.ts";
export { breadboardHalf, PITCH, BREADBOARD_COLUMNS, MAIN_ROWS, RAILS, railHasHole } from "./breadboard.ts";
export { arduinoUno, led, potentiometer, pushbutton, resistor } from "./parts.ts";
export * from "./parts-extra.ts";
export * from "./parts-power.ts";

export const catalog: readonly ComponentDefinition[] = [
  arduinoUno,
  breadboardHalf,
  resistor,
  capacitor,
  led,
  rgbLed,
  sevenSegment,
  ledBarGraph,
  buzzer,
  servo,
  lcd1602,
  pushbutton,
  potentiometer,
  slidePotentiometer,
  ldrModule,
  dht22,
  hcsr04,
  battery9v,
  dcSupply,
  rockerSwitch,
  lm317,
];

const byId = new Map(catalog.map((d) => [d.id, d]));

export function getDefinition(id: string): ComponentDefinition | undefined {
  return byId.get(id);
}

export function requireDefinition(id: string): ComponentDefinition {
  const def = byId.get(id);
  if (!def) throw new Error(`Componente desconhecido no catálogo: ${id}`);
  return def;
}

export function getPin(def: ComponentDefinition, pinId: string): PinDef | undefined {
  return def.pins.find((p) => p.id === pinId);
}

export function pinIdsOf(definitionId: string): readonly string[] | undefined {
  return byId.get(definitionId)?.pins.map((p) => p.id);
}

/** Default parameter values for a new instance. */
export function defaultParams(def: ComponentDefinition): Record<string, string | number> {
  return Object.fromEntries(def.params.map((p) => [p.key, p.default]));
}

/** Next free reference designator, e.g. R3 when R1 and R2 exist. */
export function nextRefDes(def: ComponentDefinition, existing: readonly string[]): string {
  let n = 1;
  while (existing.includes(`${def.refDesPrefix}${n}`)) n++;
  return `${def.refDesPrefix}${n}`;
}