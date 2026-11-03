import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Project } from "@simiot/project-model";
import { compileLab, evaluateLab } from "../src/index.ts";

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../../fixtures/${name}/project.json`, import.meta.url), "utf8")) as Project;
const run = (project: Project, closed: string[], pots: Record<string, number> = {}) =>
  evaluateLab(compileLab(project), { pins: {}, pressed: new Set(closed), potPositions: pots });
const withParam = (project: Project, id: string, params: Record<string, number>): Project => ({
  ...project,
  components: project.components.map((c) => (c.id === id ? { ...c, params: { ...c.params, ...params } } : c)),
});

describe("suporte v1: pilha, interruptor, LM317, R1 e LED", () => {
  const project = load("suporte-v1");
  const closed = ["cmp_sw1"];

  it("lights the LED with 18,4 mA only while the switch is closed", () => {
    const on = run(project, closed).leds.cmp_d1!;
    expect(on.lit).toBe(true);
    expect(on.currentMa).toBeCloseTo(18.4, 1);
    expect(run(project, []).leds.cmp_d1!.lit).toBe(false);
    expect(run(project, []).issues.some((i) => i.includes("sem tensão em IN"))).toBe(true);
  });

  it("holds the same current from a fresh battery down to 6,35 V, then goes dark", () => {
    for (const volts of [9.6, 9, 8, 7, 6.5]) {
      const led = run(withParam(project, "cmp_bt1", { voltage: volts }), closed).leds.cmp_d1!;
      expect(led.lit, `${volts} V`).toBe(true);
      expect(led.currentMa, `${volts} V`).toBeCloseTo(18.4, 1);
    }
    const flat = run(withParam(project, "cmp_bt1", { voltage: 6 }), closed);
    expect(flat.leds.cmp_d1!.lit).toBe(false);
    expect(flat.issues.some((i) => i.includes("fora de regulação"))).toBe(true);
  });

  it("puts 9 V on the input, 4 V above ground on OUT and 3 V (the LED) on ADJ", () => {
    const state = run(project, closed);
    const volts = Object.values(state.netVoltage);
    expect(volts).toContain(9);
    expect(volts).toContain(3);
    expect(volts.some((v) => Math.abs(v - 4.25) < 0.01)).toBe(true);
    expect(state.issues).toEqual([]);
  });
});

describe("suporte v2: fonte, diodo, LM317 e reostato", () => {
  const project = load("suporte-v2");
  const closed = ["cmp_sw1"];

  it("current follows 1,25 V / (68 + rheostat): about 18 mA at the minimum and 4,3 mA at 220 ohm", () => {
    const bright = run(project, closed, { cmp_rv1: 0 }).leds.cmp_d1!;
    expect(bright.lit).toBe(true);
    expect(bright.currentMa).toBeCloseTo(18.1, 1); // the pot never reaches 0 ohm in the model: 1 ohm
    const dim = run(project, closed, { cmp_rv1: 1 }).leds.cmp_d1!;
    expect(dim.currentMa).toBeCloseTo(4.34, 1);
    expect(dim.brightness).toBeLessThan(bright.brightness);
  });

  it("brightness moves monotonically with the knob", () => {
    const levels = [0, 0.25, 0.5, 0.75, 1].map((p) => run(project, closed, { cmp_rv1: p }).leds.cmp_d1!.currentMa!);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeLessThan(levels[i - 1]!);
  });

  it("the diode drops 0,4 V: the regulator input sits at 11,6 V", () => {
    const volts = Object.values(run(project, closed, { cmp_rv1: 0 }).netVoltage);
    expect(volts.some((v) => Math.abs(v - 11.6) < 0.01)).toBe(true);
    expect(volts).toContain(12);
  });

  it("goes dark when the switch opens or the adapter, after the diode, is under the dropout", () => {
    expect(run(project, [], { cmp_rv1: 0 }).leds.cmp_d1!.lit).toBe(false);
    const ok = run(withParam(project, "cmp_ps1", { voltage: 7 }), closed, { cmp_rv1: 0 });
    expect(ok.leds.cmp_d1!.lit).toBe(true); // 7 - 0,4 = 6,6 V >= 6,35 V
    const low = run(withParam(project, "cmp_ps1", { voltage: 6.5 }), closed, { cmp_rv1: 0 });
    expect(low.leds.cmp_d1!.lit).toBe(false); // 6,5 - 0,4 = 6,1 V < 6,35 V
    expect(low.issues.some((i) => i.includes("fora de regulação"))).toBe(true);
  });

  it("warns when the current falls below the LM317 minimum load", () => {
    const state = run(withParam(project, "cmp_rv1", { resistance: 1000 }), closed, { cmp_rv1: 1 });
    expect(state.issues.some((i) => i.includes("carga mínima"))).toBe(true);
  });

  it("a diode wired backwards blocks the supply", () => {
    const flipped: Project = {
      ...project,
      connections: project.connections.map((c) => {
        const swap = (t: { componentId: string; pinId: string }) =>
          t.componentId === "cmp_d2" ? { ...t, pinId: t.pinId === "A" ? "K" : "A" } : t;
        return { ...c, a: swap(c.a), b: swap(c.b) };
      }),
    };
    expect(run(flipped, closed, { cmp_rv1: 0 }).leds.cmp_d1!.lit).toBe(false);
  });
});
