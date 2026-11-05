/**
 * Electrical numbers of the pregoscopio light, shared by the Suporte page and its tests.
 * Both versions drive the LED with an LM317 as a constant-current source (I = 1.25 V / R between OUT and ADJ),
 * so the brightness does not follow the battery or the adapter. v1 has a fixed R1; v2 adds a rheostat in series
 * and a diode against a reversed plug.
 */

export const LED_VF = 3.1;
/** Typical capacity of an alkaline 9 V (6F22) battery at a few tens of mA. */
export const BATTERY_MAH = 500;
/** Share of that capacity available before the battery sags below the regulator's minimum input. */
export const BATTERY_USABLE = 0.8;
export const LM317_VREF = 1.25;
/** LM317 dropout, input to output, at these currents. */
export const LM317_DROPOUT = 2;
/** The LM317 needs a minimum load current to regulate (3.5 mA typical in the datasheet). */
export const LM317_MIN_LOAD_mA = 3.5;
/** Fixed resistor of both versions: 1.25 V / 68 ohm = 18.4 mA, under the 20 mA rating of a 5 mm LED. */
export const R1_OHMS = 68;
export const RHEOSTAT_OHMS = 220;
/** 1N5819 (Schottky) forward drop at about 20 mA, with margin. */
export const DIODE_DROP_V = 0.4;

export interface LightResult {
  currentmA: number;
  /** Resistance between OUT and ADJ: R1 plus the rheostat. */
  setOhms: number;
  regulatorMilliwatts: number;
  /** Heat in the set resistors (R1 and the rheostat). */
  setResistorMilliwatts: number;
  /** Smallest supply voltage that keeps the LM317 regulating, diode included. */
  minInputV: number;
  regulating: boolean;
  aboveMinLoad: boolean;
}

export function ledLight(vin: number, setOhms: number, diodeDrop = 0, vf = LED_VF): LightResult {
  const current = LM317_VREF / setOhms;
  const minInputV = vf + LM317_VREF + LM317_DROPOUT + diodeDrop;
  return {
    currentmA: current * 1000,
    setOhms,
    regulatorMilliwatts: Math.max(vin - diodeDrop - vf - LM317_VREF, 0) * current * 1000,
    setResistorMilliwatts: current * current * setOhms * 1000,
    minInputV,
    regulating: vin >= minInputV,
    aboveMinLoad: current * 1000 >= LM317_MIN_LOAD_mA,
  };
}

export interface V1Result extends LightResult {
  /** Hours of light from a battery of `capacitymAh` until it falls under the regulator's minimum input. */
  hours: number;
}

/** v1: battery -> switch -> LM317 -> R1 -> LED. */
export function v1Light(vbat: number, r1 = R1_OHMS, vf = LED_VF, capacitymAh = BATTERY_MAH): V1Result {
  const light = ledLight(vbat, r1, 0, vf);
  return { ...light, hours: (capacitymAh * BATTERY_USABLE) / Math.max(light.currentmA, 0.001) };
}

/** v2: adapter -> D2 -> switch -> LM317 -> R1 + rheostat -> LED. */
export function v2Light(vin: number, fixedOhms: number, rheostatOhms: number, vf = LED_VF): LightResult {
  return ledLight(vin, fixedOhms + rheostatOhms, DIODE_DROP_V, vf);
}

export interface TestRow {
  point: string;
  /** What to read with the multimeter, as text. */
  expected: string;
  low: number;
  high: number;
  unit: "V" | "mA";
  /** What is likely wrong when the reading is outside the range. */
  hint: string;
}

const row = (point: string, nominal: number, low: number, high: number, unit: TestRow["unit"], hint: string): TestRow => ({
  point,
  expected: `${nominal.toFixed(unit === "V" ? 2 : 1).replace(".", ",")} ${unit}`,
  low,
  high,
  unit,
  hint,
});

/** Measurement points with the values the circuit should give, nominal supply (9 V battery, 12 V adapter). */
export function testPlan(version: "v1" | "v2"): TestRow[] {
  if (version === "v1") {
    const l = v1Light(9);
    return [
      row("Pilha BT1: positivo para negativo", 9, 8.4, 9.7, "V", "Pilha fraca, clipe mal encaixado ou ligação invertida."),
      row("Entrada do U1 (depois do SW1) para GND", 9, 8.3, 9.7, "V", "Interruptor aberto, solda fria no SW1 ou fio solto."),
      row("Saída do U1 (OUT) para GND", LED_VF + LM317_VREF, 3.9, 4.8, "V", "R1 aberto ou LED invertido: a saída sobe até perto da entrada."),
      row("Ânodo do D1 (pino ADJ) para GND", LED_VF, 2.7, 3.4, "V", "LED invertido ou aberto: lê quase o mesmo que a saída do U1; em curto lê perto de 0 V."),
      row("Sobre R1 (entre OUT e ADJ)", LM317_VREF, 1.2, 1.3, "V", "Fora de 1,25 V o LM317 é falso ou está fora de regulação."),
      row("Corrente do LED, multímetro em série", l.currentmA, 17.4, 19.4, "mA", "R1 errado (confira as faixas 68 Ω: azul-cinza-preto) ou LM317 sem regulação."),
    ];
  }
  const bright = v2Light(12, R1_OHMS, 0);
  const dim = v2Light(12, R1_OHMS, RHEOSTAT_OHMS);
  return [
    row("Fonte no J1: positivo para negativo, sem carga", 12, 11.5, 15, "V", "Fonte não regulada pode ler até 15 V sem carga; abaixo de 11,5 V a fonte é fraca."),
    row("Depois do D2 para GND", 12 - DIODE_DROP_V, 11, 11.8, "V", "Diodo invertido (lê 0 V) ou queda acima de 0,5 V (diodo errado)."),
    row("Entrada do U1 (depois do SW1) para GND", 12 - DIODE_DROP_V, 10.9, 11.8, "V", "Interruptor aberto ou solda fria."),
    row("Saída do U1 (OUT) para GND", LED_VF + LM317_VREF, 3.9, 4.8, "V", "R1 ou RV1 abertos: a saída sobe até perto da entrada."),
    row("Ânodo do D1 (pino ADJ) para GND", LED_VF, 2.7, 3.4, "V", "LED invertido ou aberto: lê quase o mesmo que a saída do U1; em curto lê perto de 0 V."),
    row("Sobre R1 + RV1 (entre OUT e ADJ)", LM317_VREF, 1.2, 1.3, "V", "Fora de 1,25 V o LM317 é falso ou está fora de regulação."),
    row("Corrente do LED com RV1 no mínimo (0 Ω)", bright.currentmA, 17.0, 19.4, "mA", "R1 errado (68 Ω) ou o cursor do RV1 não liga ao pino 2 e 3."),
    row("Corrente do LED com RV1 no máximo (220 Ω)", dim.currentmA, 3.5, 5.5, "mA", "Abaixo de 3,5 mA o LM317 pode oscilar: confira o RV1 (220 Ω, não 250 Ω ou mais)."),
  ];
}
