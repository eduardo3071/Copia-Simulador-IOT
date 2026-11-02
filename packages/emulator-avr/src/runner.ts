import {
  adcConfig,
  AVRADC,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  avrInstruction,
  CPU,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
} from "avr8js";
import { createDevice, type Device, type DeviceConfig, type DeviceHost, type PinRef } from "./devices.ts";
import { loadHex } from "./hex.ts";

export type PortName = "B" | "C" | "D";
export interface PortRegisters {
  ddr: number;
  port: number;
}

export interface PinStats {
  /** Fraction of time high since the previous call, keyed like "B5". */
  duty: Record<string, number>;
  /** Width (µs) of the last complete high pulse, for pins that pulsed recently. */
  pulseUs: Record<string, number>;
  /** Rising edges per second since the previous call, for toggling pins. */
  freqHz: Record<string, number>;
}

const PORT_CONFIGS = { B: portBConfig, C: portCConfig, D: portDConfig } as const;
const PORT_NAMES: PortName[] = ["B", "C", "D"];
/** A pulse older than this no longer describes the pin (servo detached). */
const PULSE_STALE_MS = 100;

const zeros = () => ({ B: new Float64Array(8), C: new Float64Array(8), D: new Float64Array(8) });

/**
 * ATmega328P (Arduino Uno) on avr8js. Pure and synchronous so it can be driven
 * from a Web Worker or from tests; simulated time comes only from CPU cycles.
 *
 * Input pin level precedence: emulated device (DHT22, HC-SR04) > external
 * circuit (lab) > internal pull-up of a floating pin.
 */
export class AvrRunner {
  readonly clockHz: number;
  private readonly program: Uint16Array;
  private cpu!: CPU;
  private ports!: Record<PortName, AVRIOPort>;
  private adc!: AVRADC;
  private usart!: AVRUSART;
  private highCycles = zeros();
  private riseAt = zeros();
  private lastPulse = zeros();
  private lastPulseAt = zeros();
  private risingEdges = zeros();
  private lastValue: Record<PortName, number> = { B: 0, C: 0, D: 0 };
  private lastChange: Record<PortName, number> = { B: 0, C: 0, D: 0 };
  private statsWindowStart = 0;
  private analog = new Map<number, number>();
  /** Level imposed by the external circuit; null/absent = floating. */
  private external = new Map<string, boolean | null>();
  private deviceDrive = new Map<string, boolean>();
  private rxQueue: number[] = [];
  private deviceConfigs: DeviceConfig[] = [];
  private devices: Device[] = [];
  private devicesChanged = false;
  onSerialByte: (byte: number) => void = () => {};

  constructor(hex: string, clockHz = 16_000_000) {
    this.clockHz = clockHz;
    this.program = new Uint16Array(loadHex(hex).buffer);
    this.boot();
  }

  private boot() {
    for (const device of this.devices) device.dispose();
    this.devices = [];
    this.deviceDrive.clear();
    this.cpu = new CPU(this.program);
    new AVRTimer(this.cpu, timer0Config);
    new AVRTimer(this.cpu, timer1Config);
    new AVRTimer(this.cpu, timer2Config);
    this.usart = new AVRUSART(this.cpu, usart0Config, this.clockHz);
    this.usart.onByteTransmit = (byte) => this.onSerialByte(byte);
    this.adc = new AVRADC(this.cpu, adcConfig);
    this.ports = {
      B: new AVRIOPort(this.cpu, portBConfig),
      C: new AVRIOPort(this.cpu, portCConfig),
      D: new AVRIOPort(this.cpu, portDConfig),
    };
    for (const stats of [this.highCycles, this.riseAt, this.lastPulse, this.lastPulseAt, this.risingEdges]) {
      for (const name of PORT_NAMES) stats[name].fill(0);
    }
    for (const name of PORT_NAMES) {
      this.lastValue[name] = 0;
      this.lastChange[name] = 0;
      this.ports[name].addListener((value) => {
        this.recordPortChange(name, value);
        this.refreshPort(name);
        for (const device of this.devices) device.onPinsChanged();
      });
      this.refreshPort(name);
    }
    this.statsWindowStart = 0;
    for (const [channel, volts] of this.analog) this.adc.channelValues[channel] = volts;
    this.devices = this.deviceConfigs.map((config) => createDevice(this.host, config));
    this.devicesChanged = true;
  }

  private readonly host: DeviceHost = ((runner: AvrRunner): DeviceHost => ({
    get cpu() {
      return runner.cpu;
    },
    get clockHz() {
      return runner.clockHz;
    },
    mcuPin: (pin) => {
      const config = PORT_CONFIGS[pin.port];
      const mask = 1 << pin.bit;
      return { output: (this.cpu.data[config.DDR]! & mask) !== 0, high: (this.cpu.data[config.PORT]! & mask) !== 0 };
    },
    drive: (pin, level) => {
      const key = `${pin.port}${pin.bit}`;
      if (level === null) this.deviceDrive.delete(key);
      else this.deviceDrive.set(key, level);
      this.refreshPin(pin.port, pin.bit);
    },
    changed: () => {
      this.devicesChanged = true;
    },
  }))(this);

  private recordPortChange(name: PortName, value: number) {
    this.accumulate(name);
    const previous = this.lastValue[name];
    const now = this.cpu.cycles;
    for (let bit = 0; bit < 8; bit++) {
      const mask = 1 << bit;
      if (!(previous & mask) && value & mask) {
        this.riseAt[name][bit] = now;
        this.risingEdges[name][bit]! += 1;
      } else if (previous & mask && !(value & mask)) {
        this.lastPulse[name][bit] = now - this.riseAt[name][bit]!;
        this.lastPulseAt[name][bit] = now;
      }
    }
    this.lastValue[name] = value;
  }

  private accumulate(name: PortName) {
    const now = this.cpu.cycles;
    const elapsed = now - this.lastChange[name];
    if (elapsed > 0) {
      const value = this.lastValue[name];
      for (let bit = 0; bit < 8; bit++) if (value & (1 << bit)) this.highCycles[name][bit]! += elapsed;
    }
    this.lastChange[name] = now;
  }

  /** Recomputes the level seen on an input pin. */
  private refreshPin(port: PortName, bit: number) {
    const key = `${port}${bit}`;
    const device = this.deviceDrive.get(key);
    if (device !== undefined) {
      this.ports[port].setPin(bit, device);
      return;
    }
    const external = this.external.get(key);
    if (external !== undefined && external !== null) {
      this.ports[port].setPin(bit, external);
      return;
    }
    const config = PORT_CONFIGS[port];
    const mask = 1 << bit;
    const ddr = this.cpu.data[config.DDR]!;
    if (!(ddr & mask)) this.ports[port].setPin(bit, (this.cpu.data[config.PORT]! & mask) !== 0);
  }

  private refreshPort(port: PortName) {
    for (let bit = 0; bit < 8; bit++) {
      const key = `${port}${bit}`;
      // only floating pins depend on the port registers (pull-up)
      if (this.deviceDrive.has(key) || (this.external.get(key) ?? null) !== null) continue;
      this.refreshPin(port, bit);
    }
  }

  get cycles(): number {
    return this.cpu.cycles;
  }

  get timeMs(): number {
    return (this.cpu.cycles / this.clockHz) * 1000;
  }

  /** Executes at least `cycles` CPU cycles. */
  runCycles(cycles: number) {
    const target = this.cpu.cycles + cycles;
    const cpu = this.cpu;
    while (cpu.cycles < target) {
      avrInstruction(cpu);
      cpu.tick();
      if (this.rxQueue.length && !this.usart.rxBusy) this.usart.writeByte(this.rxQueue.shift()!);
    }
  }

  runMs(ms: number) {
    this.runCycles(Math.round((ms / 1000) * this.clockHz));
  }

  /**
   * DDR and the effective pin levels: for outputs this includes hardware PWM
   * (timer compare outputs drive the pin without touching PORTx); for inputs
   * it is PORTx, i.e. the pull-up enable bits.
   */
  registers(): Record<PortName, PortRegisters> {
    const out = {} as Record<PortName, PortRegisters>;
    for (const name of PORT_NAMES) {
      out[name] = { ddr: this.cpu.data[PORT_CONFIGS[name].DDR]!, port: this.lastValue[name] };
    }
    return out;
  }

  /** Duty, last pulse width and edge rate per pin since the previous call. */
  takeStats(): PinStats {
    const now = this.cpu.cycles;
    const window = now - this.statsWindowStart;
    const stats: PinStats = { duty: {}, pulseUs: {}, freqHz: {} };
    const staleCycles = (PULSE_STALE_MS / 1000) * this.clockHz;
    for (const name of PORT_NAMES) {
      this.accumulate(name);
      for (let bit = 0; bit < 8; bit++) {
        const key = `${name}${bit}`;
        stats.duty[key] = window > 0 ? Math.min(1, this.highCycles[name][bit]! / window) : (this.lastValue[name] >> bit) & 1;
        if (this.lastPulseAt[name][bit]! > 0 && now - this.lastPulseAt[name][bit]! < staleCycles) {
          stats.pulseUs[key] = Math.round((this.lastPulse[name][bit]! / this.clockHz) * 1e6);
        }
        if (window > 0 && this.risingEdges[name][bit]! >= 2) {
          stats.freqHz[key] = (this.risingEdges[name][bit]! * this.clockHz) / window;
        }
      }
      this.highCycles[name].fill(0);
      this.risingEdges[name].fill(0);
    }
    this.statsWindowStart = now;
    return stats;
  }

  takeDuty(): Record<string, number> {
    return this.takeStats().duty;
  }

  /**
   * Level imposed by the external circuit, or null when the pin is floating. A
   * floating input reads its internal pull-up synchronously, on the very
   * instruction that enables it, so `pinMode(INPUT_PULLUP)` takes effect at once.
   */
  setDigitalInput(port: PortName, bit: number, high: boolean | null) {
    this.external.set(`${port}${bit}`, high);
    this.refreshPin(port, bit);
  }

  /** Bytes typed in the serial monitor, delivered to the USART receiver one at a time. */
  writeSerial(text: string) {
    for (const byte of new TextEncoder().encode(text)) this.rxQueue.push(byte);
  }

  setAnalogInput(channel: number, volts: number) {
    this.analog.set(channel, volts);
    this.adc.channelValues[channel] = volts;
  }

  /** Replaces the emulated devices wired to the MCU (kept across resets). */
  setDevices(configs: DeviceConfig[]) {
    for (const device of this.devices) device.dispose();
    this.deviceConfigs = configs;
    this.devices = configs.map((config) => createDevice(this.host, config));
    this.devicesChanged = true;
  }

  setDeviceEnv(id: string, env: Record<string, number>) {
    this.devices.find((d) => d.config.id === id)?.setEnv(env);
    const config = this.deviceConfigs.find((c) => c.id === id);
    if (config && "env" in config) Object.assign(config.env, env);
    this.devicesChanged = true;
  }

  /** Device states if any changed since the last call. */
  takeDeviceStates(): Record<string, unknown> | undefined {
    if (!this.devicesChanged) return undefined;
    this.devicesChanged = false;
    return Object.fromEntries(this.devices.map((d) => [d.config.id, d.state()]));
  }

  /** Hardware reset: program memory is kept, external inputs and devices are re-applied. */
  reset() {
    this.boot();
    for (const [key] of this.external) this.refreshPin(key[0] as PortName, Number(key.slice(1)));
  }
}


export type { DeviceConfig, PinRef };