import { describe, expect, it } from "vitest";
import { bom, manualBom, manualSteps, masterPlan, partsUpToStep, screwPositions, ZH_NAMES } from "../src/index.ts";

describe("manual de montagem", () => {
  for (const v of ["v1", "v2"] as const) {
    it(`${v}: every part of the list is introduced by a step and has a name in Chinese`, () => {
      const steps = manualSteps(v);
      const shown = partsUpToStep(v, steps.length);
      for (const { part } of bom(v)) {
        if (part.kind === "calibracao") continue;
        expect(shown.has(part.id), `${part.id} never appears`).toBe(true);
        expect(ZH_NAMES[part.id], part.id).toBeTruthy();
      }
      expect(steps.map((s) => s.n)).toEqual(steps.map((_, i) => i + 1));
      for (const s of steps) {
        expect(s.text.pt.length).toBeGreaterThan(30);
        expect(s.text.zh.length).toBeGreaterThan(15);
      }
    });

    it(`${v}: a part is not introduced twice and nothing is added that the version does not use`, () => {
      const used = new Set(bom(v).map((l) => l.part.id));
      const seen = new Set<string>();
      for (const s of manualSteps(v)) {
        for (const id of s.adds) {
          expect(seen.has(id), id).toBe(false);
          expect(used.has(id), id).toBe(true);
          seen.add(id);
        }
      }
    });

    it(`${v}: the master plan places every printed and purchased part inside a sensible envelope`, () => {
      const plan = masterPlan(v);
      const ids = manualBom(v).map((l) => l.id).filter((id) => !["W1", "W2", "W3"].includes(id));
      for (const id of ids) expect(plan.find((p) => p.id === id), id).toBeTruthy();
      for (const p of plan) {
        if (["PS1", "P1", "P2", "P9"].includes(p.id)) continue;
        expect(Math.abs(p.x), p.id).toBeLessThanOrEqual(60);
        expect(p.y, p.id).toBeGreaterThanOrEqual(-60);
        expect(p.y, p.id).toBeLessThanOrEqual(75);
        expect(p.z, p.id).toBeGreaterThanOrEqual(-3);
        expect(p.z, p.id).toBeLessThanOrEqual(215);
      }
    });
  }

  it("lists 4 + 4 + 2 screws", () => {
    const screws = screwPositions("v1");
    expect(screws.filter((s) => s.id === "H1")).toHaveLength(4);
    expect(screws.filter((s) => s.id === "H3")).toHaveLength(4);
    expect(screws.filter((s) => s.id === "H2")).toHaveLength(2);
  });

  it("the diverging steps are only the v2 panel parts and the battery", () => {
    const only = (a: "v1" | "v2", b: "v1" | "v2") => manualSteps(a).map((s) => s.title.pt).filter((t) => !manualSteps(b).some((s) => s.title.pt === t));
    expect(only("v2", "v1").some((t) => t.includes("J1"))).toBe(true);
    expect(only("v1", "v2").some((t) => t.includes("BT1"))).toBe(true);
  });
});
