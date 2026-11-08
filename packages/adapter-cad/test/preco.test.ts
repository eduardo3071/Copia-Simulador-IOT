import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COST_LINES, PRINT_VOLUME_1000X, PRINT_VOLUME_CM3, bom, costCsv, costCsv1000x, costTable, costTable1000x, gramsOf } from "../src/index.ts";

/** Solid volume of an STL (binary or ASCII) in cm3, by the signed volume of its triangles. */
function stlVolume(file: string): number {
  const d = readFileSync(new URL(`../../../pacote-montagem/mecanica/${file}`, import.meta.url));
  const tris: number[][] = [];
  if (d.subarray(0, 5).toString() === "solid" && d.subarray(0, 400).toString().includes("facet")) {
    const text = d.toString();
    const v = [...text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    for (let i = 0; i + 2 < v.length; i += 3) tris.push([...v[i]!, ...v[i + 1]!, ...v[i + 2]!]);
  } else {
    const n = d.readUInt32LE(80);
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50 + 12;
      tris.push(Array.from({ length: 9 }, (_, k) => d.readFloatLE(o + k * 4)));
    }
  }
  let s = 0;
  for (const [ax, ay, az, bx, by, bz, cx, cy, cz] of tris as [number, number, number, number, number, number, number, number, number][]) {
    s += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return Math.abs(s) / 1000;
}

describe("custo", () => {
  it("os volumes de impressão conferem com os STL do pacote", () => {
    const files: Record<string, (v: "v1" | "v2") => string> = {
      M1: (v) => `${v === "v1" ? "v1-pilha" : "v2-fonte"}/suporte-base-coluna-impressao.stl`,
      M2: () => "comum/abracadeira-tubo-impressao.stl",
      M3: (v) => `${v === "v1" ? "v1-pilha" : "v2-fonte"}/tampa-fundo.stl`,
      M4: () => "comum/difusor.stl",
    };
    for (const v of ["v1", "v2"] as const) {
      for (const p of PRINT_VOLUME_CM3[v]) {
        expect(stlVolume(files[p.id]!(v)), `${v} ${p.id}`).toBeCloseTo(p.cm3, 0);
      }
    }
  });

  it("os volumes da versão 1000x conferem com os STL do pacote", () => {
    const files: Record<string, string> = {
      M1: "v2-1000x/suporte-base-coluna-impressao.stl",
      M2: "v2-1000x/abracadeira-tubo-impressao.stl",
      M3: "v2-1000x/tampa-fundo.stl",
      M4: "comum/difusor.stl",
      M5: "v2-1000x/tubo-de-luz.stl",
      AP1: "v2-1000x/roda-de-aberturas-impressao.stl",
    };
    for (const p of PRINT_VOLUME_1000X) expect(stlVolume(files[p.id]!), p.id).toBeCloseTo(p.cm3, 0);
  });

  it("a versão 1000x não tem LM317, R1, C1 nem reostato, e tem objetiva, óleo e LED de 3 W", () => {
    const t = costTable1000x(1);
    const ids = t.rows.map((r) => r.id);
    for (const gone of ["U1", "R1", "C1", "RV1", "RV1-knob"]) expect(ids, gone).not.toContain(gone);
    for (const kept of ["P9", "OIL", "D1", "HS1", "DR1", "CV1", "PS1", "J1", "D2", "PLA"]) expect(ids, kept).toContain(kept);
    // the aperture wheel is printed: no iris to buy
    expect(ids).not.toContain("IR1");
    expect(t.missing).toEqual([]);
    const pla = t.rows.find((r) => r.id === "PLA")!;
    expect(pla.label).toContain("AP1");
  });

  it("a versão 1000x custa mais que a v2 e o filamento segue contado pela massa", () => {
    const a = costTable("v2", 1);
    const b = costTable1000x(1);
    expect(b.used).toBeGreaterThan(a.used);
    expect(b.purchase).toBeGreaterThan(a.purchase);
    expect(b.grams).toBeGreaterThan(a.grams);
    const csv = costCsv1000x(100).trim().split("\r\n");
    expect(csv.length).toBe(costTable1000x(100).rows.length + 3);
  });

  it("toda peça comprada da lista, fora o pregoscópio, tem uma linha de preço", () => {
    for (const v of ["v1", "v2"] as const) {
      const ids = bom(v).map((l) => l.part.id).filter((id) => !/^P\d+$/.test(id));
      const priced = new Set(COST_LINES.filter((l) => l.versions.includes(v)).map((l) => l.id.split("-")[0]));
      const printed = new Set(["M1", "M2", "M3", "M4", "G1", "G2", "G3"]);
      expect(ids.filter((id) => !priced.has(id) && !printed.has(id)), v).toEqual([]);
    }
  });

  it("protótipo compra pacotes inteiros e o lote só gasta o que usa", () => {
    const one = costTable("v1", 1);
    const batch = costTable("v1", 100);
    expect(one.purchase).toBeGreaterThan(one.used);
    expect(batch.purchasePerUnit).toBeLessThan(one.purchasePerUnit);
    expect(batch.usedPerUnit).toBeCloseTo(one.usedPerUnit, 6);
    const r1 = one.rows.find((r) => r.id === "R1")!;
    expect(r1.packs).toBe(1);
    expect(batch.rows.find((r) => r.id === "R1")!.packs).toBe(5);
  });

  it("a v2 custa mais que a v1 só pelas peças da fonte, e o filamento é o maior item", () => {
    const v1 = costTable("v1", 1);
    const v2 = costTable("v2", 1);
    expect(v2.rows.some((r) => r.id === "PS1")).toBe(true);
    expect(v1.rows.some((r) => r.id === "PS1")).toBe(false);
    for (const t of [v1, v2]) {
      const top = [...t.rows].sort((a, b) => (b.used ?? 0) - (a.used ?? 0))[0]!;
      expect(top.id).toBe("PLA");
    }
  });

  it("a massa estimada usa densidade, preenchimento e perdas", () => {
    expect(gramsOf(100)).toBeCloseTo(100 * 1.24 * 0.9 * 1.1, 6);
  });

  it("as linhas sem preço ficam de fora do total e são listadas", () => {
    const t = costTable("v2", 1);
    expect(t.missing).toEqual([]);
    expect(t.used).toBeCloseTo(t.rows.reduce((s, r) => s + (r.used ?? 0), 0), 9);
  });

  it("a planilha tem cabeçalho, uma linha por item, total e custo por unidade", () => {
    const csv = costCsv("v2", 100).trim().split("\r\n");
    expect(csv.length).toBe(costTable("v2", 100).rows.length + 3);
    expect(csv[csv.length - 2]).toContain("TOTAL");
    expect(csv[csv.length - 1]).toContain("POR UNIDADE (100 un)");
  });
});
