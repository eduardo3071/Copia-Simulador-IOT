import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Project } from "@simiot/project-model";
import { compileLab, evaluateLab } from "../src/index.ts";

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../../fixtures/${name}/project.json`, import.meta.url), "utf8")) as Project;
const run = (project: Project, closed: string[], pots: Record<string, number> = {}) =>
  evaluateLab(compileLab(project), { pins: {}, pressed: new Set(closed), potPositions: pots });

describe("suporte v1: pilha, interruptor, resistor e LED", () => {
  const project = load("suporte-v1");

  it("lights the LED only while the switch is closed", () => {
    expect(run(project, ["cmp_sw1"]).leds.cmp_d1!.lit).toBe(true);
    expect(run(project, []).leds.cmp_d1!.lit).toBe(false);
  });

  it("puts 9 V on the battery side and 0 V on the other", () => {
    const state = run(project, ["cmp_sw1"]);
    const volts = Object.values(state.netVoltage);
    expect(volts).toContain(9);
    expect(volts).toContain(0);
    expect(state.issues).toEqual([]);
  });

  it("a dead battery (2 V) cannot light a white LED", () => {
    const weak = { ...project, components: project.components.map((c) => (c.id === "cmp_bt1" ? { ...c, params: { voltage: 2 } } : c)) };
    expect(run(weak, ["cmp_sw1"]).leds.cmp_d1!.lit).toBe(false);
  });
});

describe("suporte v2: LM317 como fonte de corrente", () => {
  const project = load("suporte-v2");
  const closed = ["cmp_sw1"];

  it("current follows 1,25 V / (47 + rheostat): about 26 mA at the minimum (the pot never reaches 0 ohm) and 4,7 mA at 220 ohm", () => {
    const bright = run(project, closed, { cmp_rv1: 0 }).leds.cmp_d1!;
    expect(bright.lit).toBe(true);
    expect(bright.currentMa).toBeCloseTo(26.04, 1);
    const dim = run(project, closed, { cmp_rv1: 1 }).leds.cmp_d1!;
    expect(dim.currentMa).toBeCloseTo(4.7, 0);
    expect(dim.brightness).toBeLessThan(bright.brightness);
  });

  it("brightness moves monotonically with the knob", () => {
    const levels = [0, 0.25, 0.5, 0.75, 1].map((p) => run(project, closed, { cmp_rv1: p }).leds.cmp_d1!.currentMa!);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeLessThan(levels[i - 1]!);
  });

  it("goes dark when the switch opens or the adapter is too low for the dropout", () => {
    expect(run(project, [], { cmp_rv1: 0 }).leds.cmp_d1!.lit).toBe(false);
    const low = { ...project, components: project.components.map((c) => (c.id === "cmp_ps1" ? { ...c, params: { voltage: 5 } } : c)) };
    const state = run(low, closed, { cmp_rv1: 0 });
    expect(state.leds.cmp_d1!.lit).toBe(false);
    expect(state.issues.some((i) => i.includes("LM317 fora de regulação"))).toBe(true);
  });

  it("warns when the current falls below the LM317 minimum load", () => {
    const big = { ...project, components: project.components.map((c) => (c.id === "cmp_rv1" ? { ...c, params: { resistance: 1000 } } : c)) };
    const state = run(big, closed, { cmp_rv1: 1 });
    expect(state.issues.some((i) => i.includes("carga mínima"))).toBe(true);
  });
});
