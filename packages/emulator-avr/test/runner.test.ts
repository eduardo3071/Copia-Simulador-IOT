import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AvrRunner, loadHex } from "../src/index.ts";

const hex = (name: string) => readFileSync(new URL(`../../../fixtures/${name}/firmware.hex`, import.meta.url), "utf8");

function serialOf(runner: AvrRunner) {
  let text = "";
  runner.onSerialByte = (b) => (text += String.fromCharCode(b));
  return () => text;
}

describe("AVR runner", () => {
  it("rejects corrupted HEX", () => {
    expect(() => loadHex(":0400000001020304F0\n:00000001FF")).toThrow(/Checksum/);
  });

  it("runs Blink: PB5 toggles every 500 ms of simulated time", () => {
    const runner = new AvrRunner(hex("blink"));
    const serial = serialOf(runner);
    const samples: boolean[] = [];
    for (let t = 0; t < 2000; t += 50) {
      runner.runMs(50);
      samples.push((runner.registers().B.port & (1 << 5)) !== 0);
    }
    expect(runner.registers().B.ddr & (1 << 5)).toBeTruthy();
    const transitions = samples.filter((v, i) => i > 0 && v !== samples[i - 1]).length;
    expect(transitions).toBeGreaterThanOrEqual(3);
    expect(transitions).toBeLessThanOrEqual(4);
    expect(runner.timeMs).toBeGreaterThanOrEqual(2000);
    expect(serial()).toContain("Blink iniciado");
    expect(serial()).toContain("LED ligado");
  });

  it("measures ~50% duty for Blink over whole periods", () => {
    const runner = new AvrRunner(hex("blink"));
    runner.runMs(100);
    runner.takeDuty();
    runner.runMs(2000);
    expect(runner.takeDuty().B5).toBeCloseTo(0.5, 1);
  });

  it("reads a digital input (button pulls D2 low)", () => {
    const runner = new AvrRunner(hex("button-led"));
    const serial = serialOf(runner);
    runner.setDigitalInput("D", 2, true);
    runner.runMs(100);
    expect(runner.registers().B.port & (1 << 5)).toBe(0);
    runner.setDigitalInput("D", 2, false);
    runner.runMs(100);
    expect(runner.registers().B.port & (1 << 5)).toBeTruthy();
    expect(serial()).toContain("pressionado");
  });

  it("applies INPUT_PULLUP on floating pins immediately (no false press at boot)", () => {
    const runner = new AvrRunner(hex("button-led"));
    const serial = serialOf(runner);
    runner.setDigitalInput("D", 2, null);
    runner.runMs(200);
    expect(serial()).toBe("Pronto\r\n");
    expect(runner.registers().B.port & (1 << 5)).toBe(0);
  });

  it("reports hardware PWM (analogWrite) as pin activity with the right duty", () => {
    const runner = new AvrRunner(hex("luz-rgb"));
    runner.setAnalogInput(1, 5); // slide pot at the top -> brilho 255, green = 127
    runner.setAnalogInput(0, 0.2); // bright
    runner.setDigitalInput("D", 2, false);
    runner.runMs(300);
    runner.takeStats();
    runner.runMs(200);
    const { duty } = runner.takeStats();
    expect(duty.B1).toBeCloseTo(1, 2); // red: analogWrite(255) = digitalWrite HIGH
    expect(duty.B2).toBeGreaterThan(0.45); // green: OC1B at 127/255
    expect(duty.B2).toBeLessThan(0.55);
    expect(duty.B3).toBe(0); // blue off
  });

  it("reads the ADC value injected on A0", () => {
    const runner = new AvrRunner(hex("pot-adc"));
    const serial = serialOf(runner);
    runner.setAnalogInput(0, 2.5);
    runner.runMs(250);
    expect(serial()).toMatch(/A0=51[12]/);
  });

  it("reset restarts the program and keeps inputs", () => {
    const runner = new AvrRunner(hex("pot-adc"));
    runner.setAnalogInput(0, 5);
    runner.runMs(150);
    runner.reset();
    const serial = serialOf(runner);
    expect(runner.cycles).toBe(0);
    runner.runMs(150);
    expect(serial()).toContain("A0=1023");
  });
});