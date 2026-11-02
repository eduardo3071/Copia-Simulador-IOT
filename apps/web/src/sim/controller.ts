import { compileLab, drivesFromPorts, evaluateLab, type LabCircuit, type LabState, type PortName, type PortSnapshot } from "@simiot/adapter-lab";
import { getDefinition } from "@simiot/component-catalog";
import type { DeviceConfig, FromWorker, RunState, ToWorker } from "@simiot/emulator-avr";
import type { Project } from "@simiot/project-model";

export interface SimSnapshot {
  runState: RunState;
  lab?: LabState;
  ports?: Record<PortName, PortSnapshot>;
  timeMs: number;
  realtimeRatio: number;
  /** Latest state reported by emulated devices (LCD text, sensor readings). */
  deviceStates: Record<string, unknown>;
  /** Simulated environment per part (lux, temperature, distance...). */
  env: Record<string, Record<string, number>>;
  error?: string;
}

const MAX_SERIAL = 20_000;

/**
 * Owns the emulator Web Worker and closes the loop between firmware and circuit:
 * pin registers -> lab evaluation -> input levels back to the MCU. Inputs lag by
 * at most one report interval (~33 ms); fine for buttons and pots, not for fast
 * analog feedback (that needs co-simulation, phase 3).
 */
export class SimulationController {
  private worker?: Worker;
  private lab?: LabCircuit;
  private ports?: Record<PortName, PortSnapshot>;
  private duty: Record<string, number> = {};
  private pulses: Record<string, number> = {};
  private freqs: Record<string, number> = {};
  private env: Record<string, Record<string, number>> = {};
  private sentDevices = "";
  private components: Project["components"] = [];
  private pressed = new Set<string>();
  private potPositions: Record<string, number> = {};
  private sentDigital = new Map<string, boolean | null>();
  private sentAnalog = new Map<number, number>();
  private snapshot: SimSnapshot = { runState: "idle", timeMs: 0, realtimeRatio: 1, deviceStates: {}, env: {} };
  serial = "";

  constructor(private readonly onChange: (snapshot: SimSnapshot, serial: string) => void) {}

  get state(): SimSnapshot {
    return this.snapshot;
  }

  setProject(project: Pick<Project, "components" | "connections">) {
    this.components = project.components;
    this.lab = compileLab(project);
    this.reevaluate();
  }

  start(hex: string, project: Project) {
    this.stop(false);
    this.components = project.components;
    this.lab = compileLab(project);
    this.sentDigital.clear();
    this.sentAnalog.clear();
    this.sentDevices = "";
    this.pulses = {};
    this.freqs = {};
    this.serial = "";
    this.ports = undefined;
    const worker = new Worker(new URL("./emulator.worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event: MessageEvent<FromWorker>) => this.handle(event.data));
    worker.addEventListener("error", (event) => this.update({ error: event.message || "Falha no worker do emulador" }));
    this.worker = worker;
    this.update({ runState: "idle", error: undefined, timeMs: 0, deviceStates: {} });
    this.post({ v: 1, type: "load", hex, clockHz: project.simulation.clockHz, speed: project.simulation.speed });
    // inputs must be valid before the first instruction (e.g. pull-ups read at boot)
    this.reevaluate();
    this.post({ v: 1, type: "run" });
  }

  pause() {
    this.post({ v: 1, type: "pause" });
  }

  resume() {
    this.post({ v: 1, type: "run" });
  }

  reset() {
    this.serial += "\n--- reset ---\n";
    this.post({ v: 1, type: "reset" });
  }

  /** Terminates the worker: all emulator memory is released. */
  stop(notify = true) {
    if (this.worker) {
      this.post({ v: 1, type: "stop" });
      this.worker.terminate();
      this.worker = undefined;
    }
    this.ports = undefined;
    if (notify) this.update({ runState: "stopped", lab: undefined, ports: undefined });
  }

  press(componentId: string, down: boolean) {
    if (down) this.pressed.add(componentId);
    else this.pressed.delete(componentId);
    this.reevaluate();
  }

  setPot(componentId: string, position: number) {
    this.potPositions[componentId] = position;
    this.reevaluate();
  }

  /** Value of an environment quantity: user setting, else the catalog default. */
  envValue(componentId: string, key: string): number | undefined {
    const current = this.env[componentId]?.[key];
    if (current !== undefined) return current;
    const component = this.components.find((c) => c.id === componentId);
    return component && getDefinition(component.definitionId)?.simulation.env?.find((e) => e.key === key)?.default;
  }

  setEnv(componentId: string, key: string, value: number) {
    this.env = { ...this.env, [componentId]: { ...this.env[componentId], [key]: value } };
    this.post({ v: 1, type: "deviceEnv", id: componentId, env: { [key]: value } });
    this.update({ env: this.env });
    this.reevaluate();
  }

  sendSerial(text: string) {
    this.post({ v: 1, type: "serialInput", text });
  }

  get inputs() {
    return { pressed: new Set(this.pressed), potPositions: { ...this.potPositions } };
  }

  private post(message: ToWorker) {
    this.worker?.postMessage(message);
  }

  private handle(message: FromWorker) {
    switch (message.type) {
      case "state":
        this.update({ runState: message.state, timeMs: message.timeMs });
        break;
      case "pins":
        this.ports = message.ports;
        this.duty = message.duty;
        this.pulses = message.pulseUs;
        this.freqs = message.freqHz;
        this.snapshot = { ...this.snapshot, timeMs: message.timeMs, realtimeRatio: message.realtimeRatio, ports: message.ports };
        this.reevaluate();
        break;
      case "deviceState":
        this.update({ deviceStates: { ...this.snapshot.deviceStates, ...message.states } });
        break;
      case "serial":
        this.serial = (this.serial + message.text).slice(-MAX_SERIAL);
        this.onChange(this.snapshot, this.serial);
        break;
      case "error":
        this.update({ error: message.message });
        break;
    }
  }

  private reevaluate() {
    if (!this.lab || !this.worker) return;
    const ports = this.ports ?? { B: { ddr: 0, port: 0 }, C: { ddr: 0, port: 0 }, D: { ddr: 0, port: 0 } };
    const lab = evaluateLab(this.lab, {
      pins: drivesFromPorts(this.lab, ports, this.duty, this.pulses, this.freqs),
      pressed: this.pressed,
      potPositions: this.potPositions,
      env: this.envWithDefaults(),
    });
    this.syncDevices(lab.devicePower);
    for (const input of Object.values(lab.digitalInputs)) {
      const key = `${input.port}${input.bit}`;
      const level = input.floating ? null : input.high;
      if (this.sentDigital.get(key) !== level) {
        this.sentDigital.set(key, level);
        this.post({ v: 1, type: "setDigital", port: input.port, bit: input.bit, high: level });
      }
    }
    for (const [channel, volts] of Object.entries(lab.analogInputs)) {
      const ch = Number(channel);
      if (this.sentAnalog.get(ch) !== volts) {
        this.sentAnalog.set(ch, volts);
        this.post({ v: 1, type: "setAnalog", channel: ch, volts });
      }
    }
    this.update({ lab });
  }

  private envWithDefaults(): Record<string, Record<string, number>> {
    const out: Record<string, Record<string, number>> = {};
    for (const c of this.components) {
      const defs = getDefinition(c.definitionId)?.simulation.env;
      if (defs) out[c.id] = Object.fromEntries(defs.map((d) => [d.key, this.envValue(c.id, d.key)!]));
    }
    return out;
  }

  /** Powered devices with all their signal pins wired are emulated in the worker. */
  private syncDevices(power: Record<string, boolean>) {
    if (!this.lab) return;
    const env = this.envWithDefaults();
    const configs: DeviceConfig[] = [];
    for (const d of this.lab.devices) {
      if (!power[d.componentId]) continue;
      const id = d.componentId;
      if (d.kind === "dht22" && d.data) {
        configs.push({ id, kind: "dht22", data: d.data, env: { temperature: env[id]?.temperature ?? 24, humidity: env[id]?.humidity ?? 40 } });
      } else if (d.kind === "hc-sr04" && d.trig && d.echo) {
        configs.push({ id, kind: "hc-sr04", trig: d.trig, echo: d.echo, env: { distance: env[id]?.distance ?? 100 } });
      } else if (d.kind === "lcd1602" && d.rs && d.e) {
        configs.push({ id, kind: "lcd1602", rs: d.rs, e: d.e, d: d.d.map((p) => p ?? null) });
      }
    }
    // env changes travel as deviceEnv; only wiring/power changes rebuild the devices
    const key = JSON.stringify(configs.map(({ id, kind, ...pins }) => [id, kind, "env" in pins ? { ...pins, env: undefined } : pins]));
    if (key === this.sentDevices) return;
    this.sentDevices = key;
    this.post({ v: 1, type: "devices", devices: configs });
  }

  private update(patch: Partial<SimSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.onChange(this.snapshot, this.serial);
  }
}