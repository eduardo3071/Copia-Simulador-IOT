import { getDefinition, type AvrPin, type ComponentDefinition } from "@simiot/component-catalog";
import { buildNetlist, netOfTerminal, type Netlist } from "@simiot/netlist";
import type { Project } from "@simiot/project-model";
import { solveDc, type Resistance } from "./solve.ts";

export const VCC = 5;
/** ATmega328P internal pull-up (datasheet: 20–50 kΩ). */
export const PULLUP_OHMS = 35_000;
const SWITCH_CLOSED_OHMS = 0.01;
/** Above this, a closed path between fixed voltages is reported as a short. */
const SHORT_CIRCUIT_AMPS = 0.5;
const LOGIC_THRESHOLD = VCC / 2;
/** Servo library defaults (Servo.h MIN_PULSE_WIDTH / MAX_PULSE_WIDTH). */
const SERVO_MIN_US = 544;
const SERVO_MAX_US = 2400;
/** Photoresistor model used by the module (same constants as Wokwi's). */
const LDR_RL10 = 50_000;
const LDR_GAMMA = 0.7;
const LDR_FIXED_OHMS = 10_000;

/** LM317: reference between OUT and ADJ, and the input-to-output dropout at these currents. */
export const LM317_VREF = 1.25;
/** Forward drop of the 1N5819 used against a reversed plug, at about 20 mA (with margin). */
export const DIODE_DROP_V = 0.4;
export const LM317_DROPOUT = 2;
/** Below this load current the LM317 may not regulate (datasheet: 3.5 mA typical, 10 mA maximum). */
export const LM317_MIN_LOAD_A = 0.0035;
/** Current that counts as full brightness for a white indicator LED. */
const LED_FULL_AMPS = 0.025;

const LED_FORWARD_VOLTAGE: Record<string, number> = { red: 1.8, yellow: 2.0, green: 2.1, blue: 3.0, white: 3.0 };

export interface McuPinBinding extends AvrPin {
  pinId: string;
  label: string;
  net?: string;
}

export interface PinRef {
  port: PortName;
  bit: number;
}

/** Parts whose protocol is emulated inside the MCU worker, with the MCU pins they talk to. */
export type DeviceBinding =
  | { kind: "dht22"; componentId: string; data?: PinRef }
  | { kind: "hc-sr04"; componentId: string; trig?: PinRef; echo?: PinRef }
  | { kind: "lcd1602"; componentId: string; rs?: PinRef; e?: PinRef; d: (PinRef | undefined)[] };

interface Powered {
  vcc?: string;
  gnd?: string;
}

export interface LabCircuit {
  netlist: Netlist;
  mcu?: { componentId: string; pins: McuPinBinding[] };
  sources: Map<string, number>;
  resistors: { componentId: string; ohms: number; a?: string; b?: string }[];
  leds: { componentId: string; segments: { forwardVoltage: number; anode?: string; cathode?: string }[] }[];
  switches: { componentId: string; a?: string; b?: string }[];
  pots: { componentId: string; ohms: number; endA?: string; wiper?: string; endB?: string }[];
  regulators: { componentId: string; in?: string; out?: string; adj?: string }[];
  diodes: { componentId: string; anode?: string; cathode?: string }[];
  buzzers: { componentId: string; plus?: string; minus?: string }[];
  servos: ({ componentId: string; signal?: string } & Powered)[];
  ldrModules: ({ componentId: string; ao?: string; do?: string } & Powered)[];
  devices: (DeviceBinding & Powered)[];
  issues: string[];
}

export type PortName = "B" | "C" | "D";
export interface PortSnapshot {
  /** Data direction register: bit = 1 means output. */
  ddr: number;
  /** PORTx register: output level, or pull-up enable for inputs. */
  port: number;
}

export interface McuPinDrive {
  mode: "output" | "input" | "input_pullup";
  high: boolean;
  /** Fraction of time the pin was high in the last interval (PWM). */
  duty?: number;
  /** Width of the last complete high pulse, in µs (servo signals). */
  pulseUs?: number;
  /** Rising edges per second in the last interval (tone()). */
  freqHz?: number;
}

export interface LabInputs {
  pins: Record<string, McuPinDrive>;
  pressed: ReadonlySet<string>;
  /** 0 = wiper at the GND-side end, 1 = at the VCC-side end. */
  potPositions: Readonly<Record<string, number>>;
  /** Simulated environment per part (lux, temperature, distance...). */
  env?: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

export interface LedState {
  lit: boolean;
  brightness: number;
  /** Current through the LED when the circuit sets it (regulator), in mA. */
  currentMa?: number;
  warning?: string;
}

export interface LabState {
  netVoltage: Record<string, number>;
  /** Per part: first junction at top level (single LEDs), every junction in `segments`. */
  leds: Record<string, LedState & { segments: LedState[] }>;
  buzzers: Record<string, { active: boolean; frequencyHz?: number }>;
  servos: Record<string, { angle?: number; powered: boolean }>;
  ldrModules: Record<string, { ao: number; do: boolean; powered: boolean }>;
  devicePower: Record<string, boolean>;
  /**
   * `floating` = not driven by the external circuit (only the internal pull-up, if
   * enabled, sets the level); the emulator then resolves the pull-up itself.
   */
  digitalInputs: Record<string, { port: PortName; bit: number; high: boolean; floating: boolean }>;
  analogInputs: Record<number, number>;
  issues: string[];
}

const numberParam = (value: unknown, fallback: number) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Static part of the lab: nets and the role of each part. Recompute when the project changes. */
export function compileLab(
  project: Pick<Project, "components" | "connections">,
  lookup: (id: string) => ComponentDefinition | undefined = getDefinition,
): LabCircuit {
  const netlist = buildNetlist(project, lookup);
  const lab: LabCircuit = {
    netlist,
    sources: new Map(),
    resistors: [],
    leds: [],
    switches: [],
    pots: [],
    regulators: [],
    diodes: [],
    buzzers: [],
    servos: [],
    ldrModules: [],
    devices: [],
    issues: [...netlist.issues],
  };
  const net = (componentId: string, pinId: string) => netOfTerminal(netlist, componentId, pinId);

  // the MCU first: device bindings need its pins
  for (const component of project.components) {
    const def = lookup(component.definitionId);
    if (def?.simulation.model !== "mcu-avr") continue;
    if (lab.mcu) {
      lab.issues.push(`Apenas um microcontrolador é simulado; ${component.refDes} foi ignorado.`);
      continue;
    }
    const pins: McuPinBinding[] = [];
    for (const pin of def.pins) {
      const n = net(component.id, pin.id);
      if (pin.avr) pins.push({ pinId: pin.id, label: pin.label, ...pin.avr, ...(n ? { net: n } : {}) });
      if (n && pin.voltage !== undefined && (pin.role === "power" || pin.role === "ground")) lab.sources.set(n, pin.voltage);
    }
    lab.mcu = { componentId: component.id, pins };
  }

  /** MCU pin wired directly (same net) to a part pin. */
  const mcuPin = (componentId: string, pinId: string): PinRef | undefined => {
    const n = net(componentId, pinId);
    const pin = n ? lab.mcu?.pins.find((p) => p.net === n) : undefined;
    return pin ? { port: pin.port, bit: pin.bit } : undefined;
  };
  const supply = (componentId: string, vcc: string, gnd: string): Powered => ({ ...opt("vcc", net(componentId, vcc)), ...opt("gnd", net(componentId, gnd)) });

  for (const component of project.components) {
    const def = lookup(component.definitionId);
    if (!def) continue;
    const id = component.id;
    switch (def.simulation.model) {
      case "resistor":
        lab.resistors.push({ componentId: id, ohms: numberParam(component.params.resistance, 220), ...opt("a", net(id, "1")), ...opt("b", net(id, "2")) });
        break;
      case "leds":
        lab.leds.push({
          componentId: id,
          segments: (def.simulation.leds ?? []).map((seg) => ({
            forwardVoltage: LED_FORWARD_VOLTAGE[seg.color ?? String(component.params.color)] ?? 2,
            ...opt("anode", net(id, seg.anode)),
            ...opt("cathode", net(id, seg.cathode)),
          })),
        });
        break;
      case "switch":
        lab.switches.push({ componentId: id, ...opt("a", net(id, "1.l") ?? net(id, "1.r")), ...opt("b", net(id, "2.l") ?? net(id, "2.r")) });
        break;
      case "potentiometer":
        lab.pots.push({
          componentId: id,
          ohms: numberParam(component.params.resistance, 10_000),
          ...opt("endA", net(id, "GND")),
          ...opt("wiper", net(id, "SIG")),
          ...opt("endB", net(id, "VCC")),
        });
        break;
      case "source": {
        const volts = numberParam(component.params.voltage, 9);
        const plus = net(id, "+");
        const minus = net(id, "-");
        if (plus) lab.sources.set(plus, volts);
        if (minus) lab.sources.set(minus, 0);
        break;
      }
      case "diode":
        lab.diodes.push({ componentId: id, ...opt("anode", net(id, "A")), ...opt("cathode", net(id, "K")) });
        break;
      case "regulator":
        lab.regulators.push({ componentId: id, ...opt("in", net(id, "IN")), ...opt("out", net(id, "OUT")), ...opt("adj", net(id, "ADJ")) });
        break;
      case "buzzer":
        lab.buzzers.push({ componentId: id, ...opt("plus", net(id, "2")), ...opt("minus", net(id, "1")) });
        break;
      case "servo":
        lab.servos.push({ componentId: id, ...opt("signal", net(id, "PWM")), ...supply(id, "V+", "GND") });
        break;
      case "ldr-module":
        lab.ldrModules.push({ componentId: id, ...opt("ao", net(id, "AO")), ...opt("do", net(id, "DO")), ...supply(id, "VCC", "GND") });
        break;
      case "dht22":
        lab.devices.push({ kind: "dht22", componentId: id, ...optPin("data", mcuPin(id, "SDA")), ...supply(id, "VCC", "GND") });
        break;
      case "hc-sr04":
        lab.devices.push({ kind: "hc-sr04", componentId: id, ...optPin("trig", mcuPin(id, "TRIG")), ...optPin("echo", mcuPin(id, "ECHO")), ...supply(id, "VCC", "GND") });
        break;
      case "lcd1602":
        lab.devices.push({
          kind: "lcd1602",
          componentId: id,
          ...optPin("rs", mcuPin(id, "RS")),
          ...optPin("e", mcuPin(id, "E")),
          d: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7"].map((p) => mcuPin(id, p)),
          ...supply(id, "VDD", "VSS"),
        });
        break;
      case "mcu-avr":
      case "wiring":
      case "capacitor": // open circuit in DC
        break;
    }
  }
  return lab;
}

function opt<K extends string>(key: K, value: string | undefined): { [P in K]?: string } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: string };
}

function optPin<K extends string>(key: K, value: PinRef | undefined): { [P in K]?: PinRef } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: PinRef };
}

/** Pin drive modes from the AVR port registers. */
export function drivesFromPorts(
  lab: LabCircuit,
  ports: Record<PortName, PortSnapshot>,
  duty: Readonly<Record<string, number>> = {},
  pulses: Readonly<Record<string, number>> = {},
  freqs: Readonly<Record<string, number>> = {},
): Record<string, McuPinDrive> {
  const drives: Record<string, McuPinDrive> = {};
  for (const pin of lab.mcu?.pins ?? []) {
    const { ddr, port } = ports[pin.port];
    const mask = 1 << pin.bit;
    const high = (port & mask) !== 0;
    const key = `${pin.port}${pin.bit}`;
    // a PWM pin counts as driven high (brightness then comes from the duty cycle)
    const pwm = (duty[key] ?? 0) > 0.01;
    drives[pin.pinId] = (ddr & mask) !== 0
      ? {
          mode: "output",
          high: high || pwm,
          ...(duty[key] !== undefined ? { duty: duty[key] } : {}),
          ...(pulses[key] !== undefined ? { pulseUs: pulses[key] } : {}),
          ...(freqs[key] !== undefined ? { freqHz: freqs[key] } : {}),
        }
      : { mode: high ? "input_pullup" : "input", high: false };
  }
  return drives;
}

/**
 * Simplified DC evaluation (linear resistors, ideal sources, LEDs as threshold
 * indicators). This is a logic-level aid, not a SPICE simulation.
 */
export function evaluateLab(lab: LabCircuit, inputs: LabInputs): LabState {
  const issues = [...lab.issues];
  const fixed = new Map<string, number>();
  const fix = (net: string, volts: number, who: string) => {
    const current = fixed.get(net);
    if (current !== undefined && Math.abs(current - volts) > 1e-9) {
      issues.push(`Curto-circuito na net ${net}: ${who} força ${volts} V contra ${current} V.`);
      return;
    }
    fixed.set(net, volts);
  };
  for (const [net, volts] of lab.sources) fix(net, volts, "alimentação");
  // a diode whose anode is held by a source passes it on, minus its drop; the other way round it blocks
  for (const d of lab.diodes) {
    const va = d.anode ? fixed.get(d.anode) : undefined;
    if (d.cathode && va !== undefined) fix(d.cathode, Math.max(0, va - DIODE_DROP_V), "diodo");
  }

  const resistances: Resistance[] = [];
  const outputNets = new Map<string, { pinId: string; drive: McuPinDrive; duty: number }>();
  for (const pin of lab.mcu?.pins ?? []) {
    const drive = inputs.pins[pin.pinId];
    if (!pin.net || !drive) continue;
    if (drive.mode === "output") {
      fix(pin.net, drive.high ? VCC : 0, `pino ${pin.label}`);
      outputNets.set(pin.net, { pinId: pin.pinId, drive, duty: drive.duty ?? (drive.high ? 1 : 0) });
    } else if (drive.mode === "input_pullup") {
      const rail = `__pullup_${pin.pinId}`;
      fixed.set(rail, VCC);
      resistances.push({ a: pin.net, b: rail, ohms: PULLUP_OHMS });
    }
  }

  /** A module works only when its supply pins sit on 5 V and 0 V sources. */
  const isPowered = (p: Powered) => !!p.vcc && !!p.gnd && (fixed.get(p.vcc) ?? 0) >= 4.5 && fixed.get(p.gnd) === 0;

  for (const r of lab.resistors) if (r.a && r.b) resistances.push({ a: r.a, b: r.b, ohms: r.ohms });
  const switchStart = resistances.length;
  for (const s of lab.switches) {
    if (s.a && s.b && inputs.pressed.has(s.componentId)) resistances.push({ a: s.a, b: s.b, ohms: SWITCH_CLOSED_OHMS });
  }
  const switchEnd = resistances.length;
  for (const p of lab.pots) {
    const position = Math.min(1, Math.max(0, inputs.potPositions[p.componentId] ?? 0.5));
    if (p.wiper && p.endA) resistances.push({ a: p.endA, b: p.wiper, ohms: Math.max(1, p.ohms * position) });
    if (p.wiper && p.endB) resistances.push({ a: p.wiper, b: p.endB, ohms: Math.max(1, p.ohms * (1 - position)) });
    if (!p.wiper && p.endA && p.endB) resistances.push({ a: p.endA, b: p.endB, ohms: p.ohms });
  }

  // LDR module: AO as a Thévenin source (divider), DO as a comparator output
  const ldrModules: LabState["ldrModules"] = {};
  for (const m of lab.ldrModules) {
    const powered = isPowered(m);
    const lux = Math.max(0.01, inputs.env?.[m.componentId]?.lux ?? 500);
    const rLdr = LDR_RL10 * Math.pow(lux / 10, -LDR_GAMMA);
    const ao = (VCC * rLdr) / (rLdr + LDR_FIXED_OHMS);
    const dark = ao > VCC / 2;
    ldrModules[m.componentId] = { ao: round(powered ? ao : 0), do: powered && dark, powered };
    if (!powered) continue;
    if (m.ao) {
      const node = `__ldr_ao_${m.componentId}`;
      fixed.set(node, ao);
      resistances.push({ a: m.ao, b: node, ohms: (rLdr * LDR_FIXED_OHMS) / (rLdr + LDR_FIXED_OHMS) });
    }
    if (m.do) {
      const node = `__ldr_do_${m.componentId}`;
      fixed.set(node, dark ? VCC : 0);
      resistances.push({ a: m.do, b: node, ohms: 100 });
    }
  }

  const { voltage, currents } = solveDc(fixed, resistances);
  const pullups = resistances.filter((r) => r.b.startsWith("__pullup_"));
  const external = pullups.length
    ? solveDc(new Map([...fixed].filter(([n]) => !n.startsWith("__pullup_"))), resistances.filter((r) => !pullups.includes(r))).voltage
    : voltage;
  for (let i = switchStart; i < switchEnd; i++) {
    if (Math.abs(currents[i]!) > SHORT_CIRCUIT_AMPS) {
      issues.push("Curto-circuito: botão pressionado liga diretamente duas tensões diferentes.");
    }
  }

  // LM317 as a current source: OUT sits 1.25 V above ADJ, so the resistance between them sets the current,
  // and the LED hanging from ADJ drops its own forward voltage. Below the dropout the LED stays dark.
  const regulatorAmps = new Map<string, number>();
  for (const reg of lab.regulators) {
    if (!reg.in || !reg.out || !reg.adj) {
      issues.push("LM317 com pino sem ligação (IN, OUT e ADJ precisam estar ligados).");
      continue;
    }
    const vin = voltage.get(reg.in);
    if (vin === undefined) {
      issues.push("LM317 sem tensão em IN (confira a fonte e o interruptor).");
      continue;
    }
    const sub = solveDc(new Map([[reg.out, LM317_VREF], [reg.adj, 0]]), resistances);
    let amps = 0;
    resistances.forEach((r, k) => {
      if (r.a === reg.out) amps += sub.currents[k]!;
      else if (r.b === reg.out) amps -= sub.currents[k]!;
    });
    const vf = lab.leds.flatMap((l) => l.segments).find((s) => s.anode === reg.adj)?.forwardVoltage ?? 0;
    if (amps <= 0) {
      issues.push("LM317 sem resistor entre OUT e ADJ: o LED ficaria sem corrente definida.");
      continue;
    }
    if (vin < vf + LM317_VREF + LM317_DROPOUT) {
      issues.push(`LM317 fora de regulação: IN em ${vin.toFixed(1)} V, precisa de pelo menos ${(vf + LM317_VREF + LM317_DROPOUT).toFixed(1)} V.`);
      continue;
    }
    voltage.set(reg.adj, vf);
    voltage.set(reg.out, vf + LM317_VREF);
    regulatorAmps.set(reg.adj, amps);
    if (amps < LM317_MIN_LOAD_A) issues.push(`LM317 com ${(amps * 1000).toFixed(1)} mA: abaixo da carga mínima de 3,5 mA, pode oscilar.`);
  }

  const netVoltage: Record<string, number> = {};
  for (const [net, v] of voltage) if (!net.startsWith("__")) netVoltage[net] = round(v);

  const ledState = (seg: { forwardVoltage: number; anode?: string; cathode?: string }): LedState => {
    const va = seg.anode ? voltage.get(seg.anode) : undefined;
    const vc = seg.cathode ? voltage.get(seg.cathode) : undefined;
    const lit = va !== undefined && vc !== undefined && va - vc >= seg.forwardVoltage;
    if (!lit) return { lit: false, brightness: 0 };
    let brightness = 1;
    let warning: string | undefined;
    if (fixed.has(seg.anode!) && fixed.has(seg.cathode!)) {
      warning = "LED sem resistor limitador: no circuito real a corrente excederia o limite.";
    }
    const amps = seg.anode ? regulatorAmps.get(seg.anode) : undefined;
    if (amps !== undefined) {
      return { lit, brightness: Math.min(1, Math.max(0.05, amps / LED_FULL_AMPS)), currentMa: Math.round(amps * 10_000) / 10 };
    }
    const anodeDriver = driverNear(seg.anode!, outputNets, resistances);
    const cathodeDriver = driverNear(seg.cathode!, outputNets, resistances);
    if (anodeDriver) brightness = Math.min(brightness, anodeDriver.duty);
    if (cathodeDriver) brightness = Math.min(brightness, 1 - cathodeDriver.duty);
    return { lit, brightness: brightness === 0 ? 0.05 : brightness, ...(warning ? { warning } : {}) };
  };

  const leds: LabState["leds"] = {};
  for (const led of lab.leds) {
    const segments = led.segments.map(ledState);
    const warning = segments.find((s) => s.warning)?.warning;
    leds[led.componentId] = { ...(segments[0] ?? { lit: false, brightness: 0 }), ...(warning ? { warning } : {}), segments };
  }

  const buzzers: LabState["buzzers"] = {};
  for (const b of lab.buzzers) {
    const vp = b.plus ? voltage.get(b.plus) : undefined;
    const vm = b.minus ? voltage.get(b.minus) : undefined;
    const driver = (b.plus && driverNear(b.plus, outputNets, resistances)) || (b.minus && driverNear(b.minus, outputNets, resistances)) || undefined;
    const toggling = !!driver?.drive.freqHz && driver.drive.freqHz > 0;
    const active = toggling || (vp !== undefined && vm !== undefined && vp - vm > LOGIC_THRESHOLD);
    buzzers[b.componentId] = { active, ...(toggling ? { frequencyHz: Math.round(driver!.drive.freqHz!) } : {}) };
  }

  const servos: LabState["servos"] = {};
  for (const s of lab.servos) {
    const powered = isPowered(s);
    const pulse = s.signal ? outputNets.get(s.signal)?.drive.pulseUs : undefined;
    const angle = powered && pulse !== undefined
      ? Math.round(Math.min(180, Math.max(0, ((pulse - SERVO_MIN_US) / (SERVO_MAX_US - SERVO_MIN_US)) * 180)))
      : undefined;
    servos[s.componentId] = { powered, ...(angle !== undefined ? { angle } : {}) };
  }

  const devicePower: Record<string, boolean> = {};
  for (const d of lab.devices) {
    devicePower[d.componentId] = isPowered(d);
    if (!devicePower[d.componentId]) issues.push(`${d.kind.toUpperCase()} sem alimentação (ligue VCC a 5 V e GND).`);
  }

  const digitalInputs: LabState["digitalInputs"] = {};
  const analogInputs: Record<number, number> = {};
  for (const pin of lab.mcu?.pins ?? []) {
    const drive = inputs.pins[pin.pinId];
    const v = pin.net ? voltage.get(pin.net) : undefined;
    if (drive && drive.mode !== "output") {
      const driven = pin.net ? external.get(pin.net) !== undefined : false;
      digitalInputs[pin.pinId] = { port: pin.port, bit: pin.bit, high: (v ?? 0) > LOGIC_THRESHOLD, floating: !driven };
    }
    if (pin.adcChannel !== undefined && analogInputs[pin.adcChannel] === undefined && v !== undefined) {
      analogInputs[pin.adcChannel] = round(v);
    }
  }
  return { netVoltage, leds, buzzers, servos, ldrModules, devicePower, digitalInputs, analogInputs, issues };
}

/** MCU output driving `net` directly or through one resistor. */
function driverNear(
  net: string,
  outputs: Map<string, { pinId: string; drive: McuPinDrive; duty: number }>,
  resistances: readonly Resistance[],
) {
  const direct = outputs.get(net);
  if (direct) return direct;
  for (const r of resistances) {
    const other = r.a === net ? r.b : r.b === net ? r.a : undefined;
    const driver = other && outputs.get(other);
    if (driver) return driver;
  }
  return undefined;
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** ADC reading (10 bit, AREF = VCC) for a voltage. */
export function adcCode(volts: number): number {
  return Math.max(0, Math.min(1023, Math.round((volts / VCC) * 1023)));
}