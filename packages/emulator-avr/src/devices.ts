import type { CPU } from "avr8js";

export type PortName = "B" | "C" | "D";
export interface PinRef {
  port: PortName;
  bit: number;
}

export type DeviceConfig =
  | { id: string; kind: "dht22"; data: PinRef; env: { temperature: number; humidity: number } }
  | { id: string; kind: "hc-sr04"; trig: PinRef; echo: PinRef; env: { distance: number } }
  | { id: string; kind: "lcd1602"; rs: PinRef; e: PinRef; d: (PinRef | null)[] };

export interface LcdState {
  characters: number[];
  display: boolean;
  cursor: boolean;
  blink: boolean;
  cursorX: number;
  cursorY: number;
}

/** What a device may do to the MCU it is wired to. */
export interface DeviceHost {
  cpu: CPU;
  clockHz: number;
  /** Level the MCU drives on a pin (`output` false = pin is an input). */
  mcuPin(pin: PinRef): { output: boolean; high: boolean };
  /** Drive a pin from the device; null releases it (pull-ups and the circuit take over). */
  drive(pin: PinRef, level: boolean | null): void;
  /** Mark the device state as changed so the host reports it. */
  changed(): void;
}

export interface Device {
  readonly config: DeviceConfig;
  onPinsChanged(): void;
  setEnv(env: Record<string, number>): void;
  state(): unknown;
  dispose(): void;
}

const us = (host: DeviceHost, micros: number) => Math.max(1, Math.round((micros * host.clockHz) / 1e6));
const samePin = (a: PinRef, b: PinRef) => a.port === b.port && a.bit === b.bit;

/** Runs `steps` one after another, each `[delayUs, action]` relative to the previous one. */
function schedule(host: DeviceHost, steps: [number, () => void][], alive: () => boolean) {
  let i = 0;
  const next = () => {
    if (!alive()) return;
    const step = steps[i++];
    if (!step) return;
    step[1]();
    const following = steps[i];
    if (following) host.cpu.addClockEvent(next, us(host, following[0]));
  };
  const first = steps[0];
  if (first) host.cpu.addClockEvent(next, us(host, first[0]));
}

/**
 * DHT22 single-wire protocol: the MCU pulls DATA low ≥ 1 ms and releases it;
 * the sensor answers 80 µs low + 80 µs high, then 40 bits (50 µs low, then
 * 26 µs high for 0 or 70 µs high for 1): humidity×10, temperature×10, checksum.
 */
class Dht22 implements Device {
  private lowSince: number | undefined;
  private busy = false;
  private disposed = false;
  private env: { temperature: number; humidity: number };

  constructor(private readonly host: DeviceHost, readonly config: Extract<DeviceConfig, { kind: "dht22" }>) {
    this.env = { ...config.env };
  }

  setEnv(env: Record<string, number>) {
    this.env = { temperature: env.temperature ?? this.env.temperature, humidity: env.humidity ?? this.env.humidity };
  }

  state() {
    return { ...this.env };
  }

  onPinsChanged() {
    if (this.busy) return;
    const pin = this.host.mcuPin(this.config.data);
    const pulledLow = pin.output && !pin.high;
    if (pulledLow && this.lowSince === undefined) this.lowSince = this.host.cpu.cycles;
    if (!pulledLow && this.lowSince !== undefined) {
      const lowUs = ((this.host.cpu.cycles - this.lowSince) * 1e6) / this.host.clockHz;
      this.lowSince = undefined;
      if (lowUs >= 500) this.respond();
    }
  }

  static frame(temperature: number, humidity: number): number[] {
    const h = Math.round(Math.min(100, Math.max(0, humidity)) * 10);
    const t = Math.round(Math.min(80, Math.max(-40, temperature)) * 10);
    const tRaw = t < 0 ? 0x8000 | -t : t;
    const bytes = [h >> 8, h & 0xff, tRaw >> 8, tRaw & 0xff];
    bytes.push(bytes.reduce((a, b) => a + b, 0) & 0xff);
    return bytes;
  }

  private respond() {
    this.busy = true;
    const data = this.config.data;
    const low = () => this.host.drive(data, false);
    const release = () => this.host.drive(data, null);
    // each step: [µs after the previous step, action]
    const steps: [number, () => void][] = [[30, low], [80, release]];
    let high = 80; // response high phase, then each bit's high phase
    for (const byte of Dht22.frame(this.env.temperature, this.env.humidity)) {
      for (let bit = 7; bit >= 0; bit--) {
        steps.push([high, low], [50, release]);
        high = (byte >> bit) & 1 ? 70 : 26;
      }
    }
    steps.push([high, low], [50, () => {
      release();
      this.busy = false;
    }]);
    schedule(this.host, steps, () => !this.disposed);
  }
  dispose() {
    this.disposed = true;
    this.host.drive(this.config.data, null);
  }
}

/** HC-SR04: a ≥ 10 µs pulse on TRIG gives an ECHO pulse of 58.3 µs per cm. */
class HcSr04 implements Device {
  private riseAt: number | undefined;
  private busy = false;
  private disposed = false;
  private distance: number;

  constructor(private readonly host: DeviceHost, readonly config: Extract<DeviceConfig, { kind: "hc-sr04" }>) {
    this.distance = config.env.distance;
    host.drive(config.echo, false);
  }

  setEnv(env: Record<string, number>) {
    if (env.distance !== undefined) this.distance = env.distance;
  }

  state() {
    return { distance: this.distance };
  }

  onPinsChanged() {
    const trig = this.host.mcuPin(this.config.trig);
    const high = trig.output && trig.high;
    if (high && this.riseAt === undefined) this.riseAt = this.host.cpu.cycles;
    if (!high && this.riseAt !== undefined) {
      const widthUs = ((this.host.cpu.cycles - this.riseAt) * 1e6) / this.host.clockHz;
      this.riseAt = undefined;
      if (widthUs >= 10 && !this.busy) this.ping();
    }
  }

  private ping() {
    this.busy = true;
    const d = this.distance;
    // out of range: the module times out with a ~38 ms pulse
    const echoUs = d < 2 || d > 400 ? 38_000 : d * 58.31;
    schedule(
      this.host,
      [
        [450, () => this.host.drive(this.config.echo, true)], // 8-cycle 40 kHz burst first
        [echoUs, () => {
          this.host.drive(this.config.echo, false);
          this.busy = false;
        }],
      ],
      () => !this.disposed,
    );
  }

  dispose() {
    this.disposed = true;
    this.host.drive(this.config.echo, null);
  }
}

/** HD44780 controller, written on the falling edge of E (4- or 8-bit bus). */
export class Hd44780 {
  ddram = new Uint8Array(0x80).fill(0x20);
  address = 0;
  increment = true;
  displayShift = false;
  shift = 0;
  display = false;
  cursor = false;
  blink = false;
  eightBit = true;
  private pendingHigh: number | undefined;
  private cgramMode = false;

  /** One bus transfer: `value` is D7..D0 (in 4-bit mode only D7..D4 matter). */
  write(rs: boolean, value: number) {
    if (this.eightBit) {
      this.execute(rs, value & 0xff);
      return;
    }
    const nibble = (value >> 4) & 0x0f;
    if (this.pendingHigh === undefined) {
      this.pendingHigh = nibble;
      return;
    }
    const byte = (this.pendingHigh << 4) | nibble;
    this.pendingHigh = undefined;
    this.execute(rs, byte);
  }

  private execute(rs: boolean, byte: number) {
    if (rs) {
      if (!this.cgramMode) {
        this.ddram[this.address] = byte;
        this.move(this.increment ? 1 : -1);
        if (this.displayShift) this.shift = (this.shift + (this.increment ? 1 : -1) + 40) % 40;
      }
      return;
    }
    if (byte & 0x80) {
      this.cgramMode = false;
      this.address = byte & 0x7f;
    } else if (byte & 0x40) {
      this.cgramMode = true; // custom glyphs: accepted, not rendered
    } else if (byte & 0x20) {
      const eightBit = (byte & 0x10) !== 0;
      if (this.eightBit && !eightBit) this.pendingHigh = undefined;
      this.eightBit = eightBit;
    } else if (byte & 0x10) {
      const displayMove = (byte & 0x08) !== 0;
      const right = (byte & 0x04) !== 0;
      if (displayMove) this.shift = (this.shift + (right ? -1 : 1) + 40) % 40;
      else this.move(right ? 1 : -1);
    } else if (byte & 0x08) {
      this.display = (byte & 0x04) !== 0;
      this.cursor = (byte & 0x02) !== 0;
      this.blink = (byte & 0x01) !== 0;
    } else if (byte & 0x04) {
      this.increment = (byte & 0x02) !== 0;
      this.displayShift = (byte & 0x01) !== 0;
    } else if (byte & 0x02) {
      this.address = 0;
      this.shift = 0;
    } else if (byte & 0x01) {
      this.ddram.fill(0x20);
      this.address = 0;
      this.shift = 0;
      this.increment = true;
    }
  }

  /** DDRAM addresses: line 1 = 0x00–0x27, line 2 = 0x40–0x67. */
  private move(delta: number) {
    const line = this.address >= 0x40 ? 0x40 : 0;
    let col = (this.address - line + delta) % 40;
    let next = line;
    if (col < 0) {
      col = 39;
      next = line ? 0 : 0x40;
    } else if (this.address - line + delta >= 40) {
      next = line ? 0 : 0x40;
    }
    this.address = next + col;
  }

  lcdState(cols = 16, rows = 2): LcdState {
    const characters: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) characters.push(this.display ? this.ddram[r * 0x40 + ((c + this.shift) % 40)]! : 0x20);
    }
    const line = this.address >= 0x40 ? 1 : 0;
    const col = (this.address - line * 0x40 - this.shift + 40) % 40;
    return { characters, display: this.display, cursor: this.display && this.cursor, blink: this.display && this.blink, cursorX: col, cursorY: line };
  }
}

class Lcd1602 implements Device {
  private controller = new Hd44780();
  private lastE = false;

  constructor(private readonly host: DeviceHost, readonly config: Extract<DeviceConfig, { kind: "lcd1602" }>) {}

  setEnv() {}

  state(): LcdState {
    return this.controller.lcdState();
  }

  onPinsChanged() {
    const e = this.host.mcuPin(this.config.e);
    const high = e.output && e.high;
    if (this.lastE && !high) {
      const rs = this.host.mcuPin(this.config.rs);
      let value = 0;
      this.config.d.forEach((pin, i) => {
        if (!pin) return;
        const p = this.host.mcuPin(pin);
        if (p.output && p.high) value |= 1 << i;
      });
      this.controller.write(rs.output && rs.high, value);
      this.host.changed();
    }
    this.lastE = high;
  }

  dispose() {}
}

export function createDevice(host: DeviceHost, config: DeviceConfig): Device {
  switch (config.kind) {
    case "dht22":
      return new Dht22(host, config);
    case "hc-sr04":
      return new HcSr04(host, config);
    case "lcd1602":
      return new Lcd1602(host, config);
  }
}

export { Dht22, samePin };