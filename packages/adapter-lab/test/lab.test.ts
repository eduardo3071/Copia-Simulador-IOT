import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrate } from "@simiot/project-model";
import { adcCode, compileLab, evaluateLab, solveDc, type McuPinDrive } from "../src/index.ts";

const load = (name: string) => migrate(JSON.parse(readFileSync(new URL(`../../../fixtures/${name}/project.json`, import.meta.url), "utf8")));
const out = (high: boolean): McuPinDrive => ({ mode: "output", high });

describe("DC solver", () => {
  it("matches the analytic voltage divider", () => {
    // 5 V -- 1k -- mid -- 2k -- GND  => 3.333 V
    const { voltage } = solveDc(new Map([["vcc", 5], ["gnd", 0]]), [
      { a: "vcc", b: "mid", ohms: 1000 },
      { a: "mid", b: "gnd", ohms: 2000 },
    ]);
    expect(voltage.get("mid")).toBeCloseTo(10 / 3, 6);
  });

  it("leaves floating nodes undefined", () => {
    const { voltage } = solveDc(new Map([["vcc", 5]]), [{ a: "x", b: "y", ohms: 10 }]);
    expect(voltage.has("x")).toBe(false);
  });
});

describe("lab evaluation", () => {
  it("lights the blink LED only when D13 is high", () => {
    const lab = compileLab(load("blink"));
    expect(lab.mcu?.componentId).toBe("cmp_uno");
    const on = evaluateLab(lab, { pins: { "13": out(true) }, pressed: new Set(), potPositions: {} });
    const off = evaluateLab(lab, { pins: { "13": out(false) }, pressed: new Set(), potPositions: {} });
    expect(on.leds.cmp_d1).toMatchObject({ lit: true });
    expect(on.leds.cmp_d1!.warning).toBeUndefined();
    expect(off.leds.cmp_d1).toMatchObject({ lit: false });
    expect(on.issues).toEqual([]);
  });

  it("uses PWM duty as LED brightness", () => {
    const lab = compileLab(load("blink"));
    const state = evaluateLab(lab, { pins: { "13": { mode: "output", high: true, duty: 0.25 } }, pressed: new Set(), potPositions: {} });
    expect(state.leds.cmp_d1!.brightness).toBeCloseTo(0.25);
  });

  it("reads the button through the internal pull-up", () => {
    const lab = compileLab(load("button-led"));
    const pins = { "2": { mode: "input_pullup", high: false } as McuPinDrive, "13": out(false) };
    const released = evaluateLab(lab, { pins, pressed: new Set(), potPositions: {} });
    const pressed = evaluateLab(lab, { pins, pressed: new Set(["cmp_sw1"]), potPositions: {} });
    // released: only the internal pull-up holds D2 high, so it is not externally driven
    expect(released.digitalInputs["2"]).toMatchObject({ high: true, floating: true, port: "D", bit: 2 });
    expect(pressed.digitalInputs["2"]).toMatchObject({ high: false, floating: false });
  });

  it("reports a floating input without pull-up", () => {
    const lab = compileLab(load("button-led"));
    const state = evaluateLab(lab, { pins: { "2": { mode: "input", high: false } }, pressed: new Set(), potPositions: {} });
    expect(state.digitalInputs["2"]).toMatchObject({ floating: true, high: false });
  });

  it("maps potentiometer position to the A0 voltage", () => {
    const lab = compileLab(load("pot-adc"));
    for (const position of [0, 0.25, 0.5, 1]) {
      const state = evaluateLab(lab, { pins: {}, pressed: new Set(), potPositions: { cmp_rv1: position } });
      expect(state.analogInputs[0]).toBeCloseTo(5 * position, 2);
    }
    expect(adcCode(2.5)).toBe(512);
  });

  it("flags an LED without series resistor", () => {
    const project = load("pot-adc");
    const withLed = {
      ...project,
      components: [...project.components, { id: "cmp_d9", definitionId: "led", definitionVersion: 1, refDes: "D9", params: { color: "red" } }],
      connections: [
        ...project.connections,
        { id: "c1", kind: "wire" as const, a: { componentId: "cmp_d9", pinId: "A" }, b: { componentId: "cmp_uno", pinId: "12" } },
        { id: "c2", kind: "wire" as const, a: { componentId: "cmp_d9", pinId: "C" }, b: { componentId: "cmp_uno", pinId: "GND.3" } },
      ],
    };
    const state = evaluateLab(compileLab(withLed), { pins: { "12": out(true) }, pressed: new Set(), potPositions: {} });
    expect(state.leds.cmp_d9!.warning).toMatch(/resistor/);
  });
});

describe("new parts", () => {
  const none = { pressed: new Set<string>(), potPositions: {} };

  it("binds DHT22 and LCD pins to the MCU through the wires", () => {
    const lab = compileLab(load("sensores-lcd"));
    const dht = lab.devices.find((d) => d.kind === "dht22");
    const lcd = lab.devices.find((d) => d.kind === "lcd1602");
    expect(dht).toMatchObject({ data: { port: "D", bit: 7 } });
    expect(lcd).toMatchObject({ rs: { port: "B", bit: 4 }, e: { port: "B", bit: 3 } });
    if (lcd?.kind !== "lcd1602") throw new Error("lcd");
    expect(lcd.d.slice(4)).toEqual([{ port: "D", bit: 5 }, { port: "D", bit: 4 }, { port: "D", bit: 3 }, { port: "D", bit: 2 }]);
    expect(lcd.d.slice(0, 4)).toEqual([undefined, undefined, undefined, undefined]);
    const state = evaluateLab(lab, { ...none, pins: {} });
    expect(state.devicePower).toEqual({ cmp_lcd: true, cmp_dht: true });
  });

  it("reports an unpowered sensor", () => {
    const project = load("sensores-lcd");
    const unpowered = { ...project, connections: project.connections.filter((c) => c.id !== "conn_dht_vcc") };
    const state = evaluateLab(compileLab(unpowered), { ...none, pins: {} });
    expect(state.devicePower.cmp_dht).toBe(false);
    expect(state.issues.join()).toMatch(/DHT22 sem alimentação/);
  });

  it("LDR module: AO follows the photoresistor divider and DO flags darkness", () => {
    const lab = compileLab(load("luz-rgb"));
    const at = (lux: number) => evaluateLab(lab, { ...none, pins: { "2": { mode: "input", high: false } }, env: { cmp_ldr: { lux } } });
    const dark = at(10); // R = 50 kΩ -> 5 * 50 / 60
    expect(dark.analogInputs[0]).toBeCloseTo(4.167, 2);
    expect(dark.digitalInputs["2"]).toMatchObject({ high: true, floating: false });
    const bright = at(10_000); // R = 397 Ω
    expect(bright.analogInputs[0]).toBeCloseTo(0.191, 2);
    expect(bright.digitalInputs["2"]).toMatchObject({ high: false });
  });

  it("RGB LED: each colour follows its PWM pin through the resistor", () => {
    const lab = compileLab(load("luz-rgb"));
    const state = evaluateLab(lab, {
      ...none,
      pins: { "9": { mode: "output", high: true, duty: 0.5 }, "10": { mode: "output", high: false, duty: 0 }, "11": out(true) },
    });
    const segments = state.leds.cmp_rgb!.segments;
    expect(segments.map((s) => s.lit)).toEqual([true, false, true]);
    expect(segments[0]!.brightness).toBeCloseTo(0.5);
    expect(state.leds.cmp_rgb!.warning).toBeUndefined();
  });

  it("7-segment shows the digit driven on D2-D8", () => {
    const lab = compileLab(load("contador-7seg"));
    const digit1 = 0x06; // segments B and C
    const pins = Object.fromEntries([2, 3, 4, 5, 6, 7, 8].map((p, s) => [String(p), out(((digit1 >> s) & 1) === 1)]));
    const state = evaluateLab(lab, { ...none, pins });
    expect(state.leds.cmp_seg!.segments.map((s) => s.lit)).toEqual([false, true, true, false, false, false, false, false]);
  });

  it("servo angle from the pulse width; buzzer frequency from the toggling pin", () => {
    const lab = compileLab(load("ultrassom-servo"));
    const state = evaluateLab(lab, {
      ...none,
      pins: { "9": { mode: "output", high: false, pulseUs: 1472 }, "10": { mode: "output", high: true, freqHz: 1000 } },
    });
    expect(state.servos.cmp_servo).toEqual({ powered: true, angle: 90 });
    expect(state.buzzers.cmp_bz).toEqual({ active: true, frequencyHz: 1000 });
  });
});