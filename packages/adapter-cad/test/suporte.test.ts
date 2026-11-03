import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bom, bomCsv, ledLight, partFile, R1_OHMS, RHEOSTAT_OHMS, SUPORTE_PARTS, testPlan, v1Light, v2Light } from "../src/index.ts";

const PUBLIC = new URL("../../../apps/web/public/suporte/", import.meta.url);
const ELECTRICAL = /^(D|R|SW|BT|PS|J|U|RV|PCB|C)\d/;

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
    const electronics = (v: "v1" | "v2") => bom(v).map((l) => l.part.id).filter((id) => ELECTRICAL.test(id));
    expect(electronics("v1")).toEqual(["D1", "R1", "C1", "SW1", "BT1", "U1", "PCB1"]);
    expect(electronics("v2")).toEqual(["D1", "R1", "C1", "D2", "SW1", "PS1", "J1", "U1", "RV1", "PCB1"]);
  });

  it("counts the screws each version needs", () => {
    const qty = (v: "v1" | "v2", id: string) => bom(v).find((l) => l.part.id === id)?.qty ?? 0;
    expect([qty("v1", "H1"), qty("v1", "H2"), qty("v1", "H3")]).toEqual([4, 2, 4]);
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

describe("lista de compras", () => {
  const lines = (v: "v1" | "v2") => bomCsv(v).trim().split("\r\n");

  it("has one line per purchased part, a header and no printed or reference parts", () => {
    expect(lines("v1")).toHaveLength(1 + 12);
    expect(lines("v2")).toHaveLength(1 + 15);
    for (const v of ["v1", "v2"] as const) {
      const csv = bomCsv(v);
      expect(csv.startsWith("﻿")).toBe(true);
      expect(csv).toContain("LM317T");
      expect(csv).not.toContain("Suporte: caixa");
      expect(csv).not.toContain("Garra");
    }
    expect(bomCsv("v1")).toContain("BT1");
    expect(bomCsv("v1")).not.toContain("1N5819");
    expect(bomCsv("v2")).toContain("1N5819");
  });

  it("leaves the price empty (none was checked) and every line has the same 7 columns", () => {
    for (const v of ["v1", "v2"] as const) {
      for (const line of lines(v)) expect(line.split('";"')).toHaveLength(7);
      expect(lines(v)[1]!.endsWith('"";""') || lines(v)[1]!.endsWith('""')).toBe(true);
    }
  });
});

describe("calculos eletricos", () => {
  it("v1: LM317 holds 18,4 mA with R1 = 68 ohm whatever the battery, down to 6,35 V", () => {
    const fresh = v1Light(9);
    expect(fresh.currentmA).toBeCloseTo(18.38, 1);
    expect(fresh.setResistorMilliwatts).toBeCloseTo(23, 0);
    expect(fresh.regulatorMilliwatts).toBeCloseTo(85.5, 0);
    expect(fresh.minInputV).toBeCloseTo(6.35, 2);
    expect(fresh.hours).toBeCloseTo(21.8, 0);
    const tired = v1Light(7);
    expect(tired.currentmA).toBeCloseTo(fresh.currentmA, 6);
    expect(tired.regulating).toBe(true);
    expect(v1Light(6).regulating).toBe(false);
  });

  it("v2: current runs from 18,4 to 4,3 mA over the rheostat, diode included in the minimum input", () => {
    const bright = v2Light(12, R1_OHMS, 0);
    const dim = v2Light(12, R1_OHMS, RHEOSTAT_OHMS);
    expect(bright.currentmA).toBeCloseTo(18.38, 1);
    expect(dim.currentmA).toBeCloseTo(4.34, 1);
    expect(dim.aboveMinLoad).toBe(true);
    expect(bright.minInputV).toBeCloseTo(6.75, 2);
    expect(bright.regulatorMilliwatts).toBeCloseTo(133, 0);
    expect(v2Light(5, R1_OHMS, 0).regulating).toBe(false);
    expect(v2Light(12, R1_OHMS, 330).aboveMinLoad).toBe(false);
  });

  it("the diode drop is what separates the two supplies", () => {
    expect(ledLight(7, 68, 0.4).regulating).toBe(true);
    expect(ledLight(6.5, 68, 0.4).regulating).toBe(false);
    expect(ledLight(6.5, 68, 0).regulating).toBe(true);
  });
});

describe("plano de teste", () => {
  it("v1 has 6 points and v2 has 8, each with a range around its nominal value", () => {
    expect(testPlan("v1")).toHaveLength(6);
    expect(testPlan("v2")).toHaveLength(8);
    for (const v of ["v1", "v2"] as const) {
      for (const r of testPlan(v)) {
        const nominal = Number(r.expected.split(" ")[0]!.replace(",", "."));
        expect(nominal, r.point).toBeGreaterThanOrEqual(r.low);
        expect(nominal, r.point).toBeLessThanOrEqual(r.high);
        expect(r.hint.length, r.point).toBeGreaterThan(10);
      }
    }
  });

  it("the current rows follow the calculation", () => {
    const v1 = testPlan("v1").find((r) => r.unit === "mA")!;
    expect(v1.expected).toBe("18,4 mA");
    const v2 = testPlan("v2").filter((r) => r.unit === "mA");
    expect(v2.map((r) => r.expected)).toEqual(["18,4 mA", "4,3 mA"]);
  });
});
