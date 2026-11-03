/** Electrical numbers of the pregoscopio light, shared by the Suporte page and its tests. */

export const LED_VF = 3.1;
/** Typical capacity of an alkaline 9 V (6F22) battery at a few mA. */
export const BATTERY_MAH = 500;
export const LM317_VREF = 1.25;
/** LM317 dropout, input to output, at these currents. */
export const LM317_DROPOUT = 2;
/** The LM317 needs a minimum load current to regulate (3.5 mA typical in the datasheet). */
export const LM317_MIN_LOAD_mA = 3.5;

export interface V1Result {
  currentmA: number;
  resistorMilliwatts: number;
  /** Hours of light from a battery of `capacitymAh`, ignoring the voltage drop as it discharges. */
  hours: number;
  /** Resistor that would give exactly `targetmA`. */
  resistorForTarget: number;
}

export function v1Light(vbat: number, resistor: number, vf = LED_VF, capacitymAh = BATTERY_MAH, targetmA = 20): V1Result {
  const current = Math.max(vbat - vf, 0) / resistor;
  return {
    currentmA: current * 1000,
    resistorMilliwatts: current * current * resistor * 1000,
    hours: capacitymAh / Math.max(current * 1000, 0.001),
    resistorForTarget: Math.max(vbat - vf, 0) / (targetmA / 1000),
  };
}

export interface V2Result {
  currentmA: number;
  /** Fixed resistor and rheostat combined. */
  setOhms: number;
  regulatorMilliwatts: number;
  /** Smallest input voltage that keeps the LM317 regulating. */
  minInputV: number;
  regulating: boolean;
  aboveMinLoad: boolean;
}

export function v2Light(vin: number, fixedOhms: number, rheostatOhms: number, vf = LED_VF): V2Result {
  const setOhms = fixedOhms + rheostatOhms;
  const current = LM317_VREF / setOhms;
  const minInputV = vf + LM317_VREF + LM317_DROPOUT;
  return {
    currentmA: current * 1000,
    setOhms,
    regulatorMilliwatts: Math.max(vin - vf - LM317_VREF, 0) * current * 1000,
    minInputV,
    regulating: vin >= minInputV,
    aboveMinLoad: current * 1000 >= LM317_MIN_LOAD_mA,
  };
}
