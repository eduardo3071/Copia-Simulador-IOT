import { describe, expect, it } from "vitest";
import {
  bom1000x, calibration1000x, componentes1000x, files1000x, layoutEconomica1000x, masterPlan1000x, partsUpToStep1000x, screwPositions1000x, steps1000x,
  testPlan1000x, wireCutList1000x, wiringOrder1000x, esquematico1000x, PRINT_1000X, QA_1000X,
} from "../src/index.ts";

describe("manual da versão 1000x", () => {
  const steps = steps1000x();
  const lines = bom1000x();

  it("tem 10 passos numerados em ordem e cada um com título, texto e três idiomas", () => {
    expect(steps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const s of steps) {
      for (const t of [s.title, s.text]) {
        expect(t.pt.length, `passo ${s.n}`).toBeGreaterThan(10);
        expect(t.zh.length).toBeGreaterThan(5);
        expect(t.en.length).toBeGreaterThan(10);
      }
    }
  });

  it("toda peça da lista aparece em algum passo, menos a pasta térmica, que só é citada no texto", () => {
    const seen = partsUpToStep1000x(99);
    for (const l of lines) {
      if (l.id === "TP1") continue;
      expect(seen.has(l.id), `${l.id} nunca aparece`).toBe(true);
    }
    // nothing appears that is not on the list
    for (const id of seen) expect(lines.some((l) => l.id === id), `${id} fora da lista`).toBe(true);
  });

  it("a ordem é montável: a tampa antes de fechar, a roda depois de fechar, o teste antes do difusor", () => {
    const first = (id: string) => steps.findIndex((s) => s.adds.includes(id)) + 1;
    expect(first("M3")).toBeLessThan(first("H1"));
    expect(first("H1")).toBeLessThan(first("AP1"));
    expect(first("D2")).toBeLessThan(first("W1"));
    expect(first("W1")).toBeLessThan(steps.findIndex((s) => s.title.pt.startsWith("Teste elétrico")) + 1);
    expect(steps.findIndex((s) => s.title.pt.startsWith("Teste elétrico")) + 1).toBeLessThan(first("M4"));
    expect(first("P9")).toBeLessThan(first("OIL"));
  });

  it("a posição de cada peça da lista existe, com tamanho e fixação", () => {
    const plan = masterPlan1000x();
    for (const l of lines) {
      if (/^P(1|2|3|4|5|6|10)$/.test(l.id) && !["P1", "P2"].includes(l.id)) continue;
      if (l.id === "TP1") continue;
      const q = plan.find((x) => x.id === l.id);
      expect(q, l.id).toBeTruthy();
      expect(q!.size.every((n) => n > 0), l.id).toBe(true);
      expect(q!.mount.pt.length).toBeGreaterThan(5);
    }
  });

  it("os parafusos: 4 H1, 4 H3 e 2 H2", () => {
    const sc = screwPositions1000x();
    expect(sc.filter((s) => s.id === "H1")).toHaveLength(4);
    expect(sc.filter((s) => s.id === "H3")).toHaveLength(4);
    expect(sc.filter((s) => s.id === "H2")).toHaveLength(2);
    for (const id of ["H1", "H2", "H3"]) expect(lines.find((l) => l.id === id)!.qty).toBe(sc.filter((s) => s.id === id).length);
  });

  it("o plano de teste tem 6 pontos com faixa e dica, e a lista de soldagem passa pelos 5 fios", () => {
    const plan = testPlan1000x();
    expect(plan).toHaveLength(6);
    for (const r of plan) {
      expect(r.range.length).toBeGreaterThan(3);
      expect(r.hint.pt.length).toBeGreaterThan(10);
    }
    const w = wiringOrder1000x().map((x) => x.pt).join(" ");
    for (const id of ["F1", "F2", "F3", "F4", "F5"]) expect(w).toContain(id);
    expect(wireCutList1000x()).toHaveLength(5);
  });

  it("a lista de impressão cobre as 6 peças impressas, e os arquivos citados existem na lista", () => {
    expect(PRINT_1000X.map((r) => r.part)).toEqual(["M1", "M2", "M3", "M4", "M5", "AP1"]);
    expect(files1000x().some((f) => f.file.includes("roda-de-aberturas"))).toBe(true);
    expect(files1000x().some((f) => f.file.includes("tubo-de-luz"))).toBe(true);
  });

  it("as peças supostas da tabela de dimensões aparecem na lista de compras", () => {
    const ids = lines.map((l) => l.id);
    for (const c of componentes1000x().filter((x) => x.evidence === "suposto")) expect(ids, c.id).toContain(c.id);
  });

  it("o texto de calibração e a inspeção citam os números do projeto", () => {
    const l = layoutEconomica1000x();
    expect(calibration1000x().map((x) => x.pt).join(" ")).toContain("44,8");
    expect(QA_1000X.map((x) => x.pt).join(" ")).toContain("37 mm");
    expect(l.params.objectiveLength).toBeCloseTo(44.82, 2);
  });

  it("o esquemático é um SVG com os cinco fios e as seis partes", () => {
    const svg = esquematico1000x();
    expect(svg.startsWith("<svg")).toBe(true);
    for (const t of ["F1", "F2", "F3", "F4", "F5", "J1", "D2", "SW1", "DR1", "D1"]) expect(svg).toContain(t);
  });
});
