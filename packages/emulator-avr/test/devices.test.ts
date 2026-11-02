import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AvrRunner, Dht22, Hd44780, type LcdState } from "../src/index.ts";

const hex = (name: string) => readFileSync(new URL(`../../../fixtures/${name}/firmware.hex`, import.meta.url), "utf8");
const text = (state: LcdState, row: number) => String.fromCharCode(...state.characters.slice(row * 16, row * 16 + 16));

function serialOf(runner: AvrRunner) {
  let out = "";
  runner.onSerialByte = (b) => (out += String.fromCharCode(b));
  return () => out;
}

describe("HD44780", () => {
  it("handles 4-bit init, text, cursor moves and clear", () => {
    const lcd = new Hd44780();
    const nibble = (rs: boolean, n: number) => lcd.write(rs, n << 4);
    // LiquidCrystal init: 0x3, 0x3, 0x3, 0x2 nibbles, then 4-bit commands
    for (const n of [3, 3, 3, 2]) nibble(false, n);
    const byte = (rs: boolean, b: number) => {
      nibble(rs, b >> 4);
      nibble(rs, b & 0xf);
    };
    byte(false, 0x28); // 4-bit, 2 lines
    byte(false, 0x0c); // display on
    byte(false, 0x01); // clear
    for (const ch of "Ola") byte(true, ch.charCodeAt(0));
    byte(false, 0x80 | 0x40); // second line
    for (const ch of "mundo") byte(true, ch.charCodeAt(0));
    const state = lcd.lcdState();
    expect(text(state, 0).trimEnd()).toBe("Ola");
    expect(text(state, 1).trimEnd()).toBe("mundo");
    expect(state).toMatchObject({ display: true, cursorX: 5, cursorY: 1 });
    byte(false, 0x01);
    expect(text(lcd.lcdState(), 0).trim()).toBe("");
  });
});

describe("DHT22 frame", () => {
  it("encodes humidity, signed temperature and checksum", () => {
    expect(Dht22.frame(24, 40)).toEqual([0x01, 0x90, 0x00, 0xf0, (0x01 + 0x90 + 0xf0) & 0xff]);
    const negative = Dht22.frame(-5.5, 65.2);
    expect((negative[2]! << 8) | negative[3]!).toBe(0x8000 | 55);
  });
});

describe("emulated devices with real firmware", () => {
  it("DHT22 + LCD: the Adafruit library reads the sensor and LiquidCrystal shows it", () => {
    const runner = new AvrRunner(hex("sensores-lcd"));
    const serial = serialOf(runner);
    runner.setDevices([
      { id: "dht", kind: "dht22", data: { port: "D", bit: 7 }, env: { temperature: 24, humidity: 40 } },
      {
        id: "lcd",
        kind: "lcd1602",
        rs: { port: "B", bit: 4 },
        e: { port: "B", bit: 3 },
        d: [null, null, null, null, { port: "D", bit: 5 }, { port: "D", bit: 4 }, { port: "D", bit: 3 }, { port: "D", bit: 2 }],
      },
    ]);
    runner.runMs(2600);
    expect(serial()).toContain("T=24.0 H=40.0");
    const lcd = runner.takeDeviceStates()!.lcd as LcdState;
    expect(text(lcd, 0).trimEnd()).toBe("Temp: 24.0 C");
    expect(text(lcd, 1).trimEnd()).toBe("Umid: 40.0 %");

    runner.setDeviceEnv("dht", { temperature: -5.5, humidity: 65.2 });
    runner.runMs(2200);
    expect(serial()).toContain("T=-5.5 H=65.2");
  }, 60_000);

  it("reports a failed read when the sensor is not attached", () => {
    const runner = new AvrRunner(hex("sensores-lcd"));
    const serial = serialOf(runner);
    runner.runMs(2600);
    expect(serial()).toContain("Falha ao ler o DHT22");
  }, 60_000);

  it("HC-SR04 drives the servo pulse and the buzzer tone", () => {
    const runner = new AvrRunner(hex("ultrassom-servo"));
    const serial = serialOf(runner);
    runner.setDevices([{ id: "sonar", kind: "hc-sr04", trig: { port: "D", bit: 7 }, echo: { port: "B", bit: 0 }, env: { distance: 100 } }]);
    runner.runMs(400);
    expect(serial()).toMatch(/Distancia: (99\.\d|10\d\.\d) cm/);
    runner.takeStats();
    runner.runMs(200);
    const far = runner.takeStats();
    // ~100 cm -> map(99, 2, 200, 0, 180) = 88 deg -> 544 + 88 * (2400 - 544) / 180 = 1451 us
    expect(far.pulseUs.B1).toBeGreaterThan(1420);
    expect(far.pulseUs.B1).toBeLessThan(1500);
    expect(far.freqHz.B2 ?? 0).toBe(0);

    runner.setDeviceEnv("sonar", { distance: 10 });
    runner.runMs(400);
    runner.takeStats();
    runner.runMs(300);
    const near = runner.takeStats();
    expect(near.freqHz.B2).toBeGreaterThan(950);
    expect(near.freqHz.B2).toBeLessThan(1050);
    expect(near.pulseUs.B1).toBeLessThan(700); // close object -> angle near 0
  }, 60_000);

  it("HC-SR04 out of range yields no echo inside the 30 ms timeout", () => {
    const runner = new AvrRunner(hex("ultrassom-servo"));
    const serial = serialOf(runner);
    runner.setDevices([{ id: "sonar", kind: "hc-sr04", trig: { port: "D", bit: 7 }, echo: { port: "B", bit: 0 }, env: { distance: 500 } }]);
    runner.runMs(400);
    expect(serial()).toContain("Distancia: 0.0 cm");
  }, 60_000);
});