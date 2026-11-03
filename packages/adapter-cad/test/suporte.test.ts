import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bom, partFile, SUPORTE_PARTS, v1Light, v2Light } from "../src/index.ts";

const PUBLIC = new URL("../../../apps/web/public/suporte/", import.meta.url);

describe("catalogo do suporte", () => {
  it("has unique identifiers and every part explains why it was chosen", () => {
    const ids = SUPORTE_PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of SUPORTE_PARTS) {
      expect(p.qty, p.id).toBeGreaterThan(0);
      expect(p.criterion.length, p.id).toBeGreaterThan(20);
      expect(p.spec.length, p.id).toBeGreaterThan(3);
    }
  });

  it("lists the electronics of each version with the same designators as the schematics", () => {
    const electronics = (v: "v1" | "v2") => bom(v).map((l) => l.part.id).filter((id) => /^(D|R|SW|BT|PS|J|U|RV|PCB)\d/.test(id));
    expect(electronics("v1")).toEqual(["D1", "R1", "SW1", "BT1"]);
    expect(electronics("v2")).toEqual(["D1", "R1", "SW1", "PS1", "J1", "U1", "RV1", "PCB1"]);
  });

  it("counts the screws each version needs", () => {
    const qty = (v: "v1" | "v2", id: string) => bom(v).find((l) => l.part.id === id)?.qty ?? 0;
    expect([qty("v1", "H1"), qty("v1", "H2"), qty("v1", "H3")]).toEqual([4, 2, 0]);
    expect([qty("v2", "H1"), qty("v2", "H2"), qty("v2", "H3")]).toEqual([4, 2, 4]);
  });

  it("every file the page links to exists in apps/web/public/suporte", () => {
    for (const p of SUPORTE_PARTS) {
      for (const v of ["v1", "v2"] as const) {
        const file = partFile(p, v);
        if (file && p.versions.includes(v)) expect(existsSync(new URL(file, PUBLIC)), `${p.id} ${file}`).toBe(true);
      }
    }
  });
});

describe("calculos eletricos", () => {
  it("v1: 9 V, 330 ohm and a 3,1 V LED", () => {
    const r = v1Light(9, 330);
    expect(r.currentmA).toBeCloseTo(17.88, 1);
    expect(r.resistorMilliwatts).toBeCloseTo(105.5, 0);
    expect(r.hours).toBeCloseTo(28, 0);
    expect(r.resistorForTarget).toBeCloseTo(295, 0);
  });

  it("v2: current runs from 4,7 to 26,6 mA over the rheostat, with the LM317 limits", () => {
    expect(v2Light(12, 47, 0).currentmA).toBeCloseTo(26.6, 1);
    const low = v2Light(12, 47, 220);
    expect(low.currentmA).toBeCloseTo(4.68, 1);
    expect(low.aboveMinLoad).toBe(true);
    expect(low.minInputV).toBeCloseTo(6.35, 2);
    expect(v2Light(12, 47, 0).regulatorMilliwatts).toBeCloseTo(203.5, 0);
    expect(v2Light(5, 47, 0).regulating).toBe(false);
  });
});
