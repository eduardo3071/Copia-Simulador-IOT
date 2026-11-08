import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COVER_GLASS, componentes1000x, derived1000x, holderLayout, layoutEconomica1000x, DEFAULT_HOLDER_PARAMS } from "../src/index.ts";

describe("versão 1000x econômica", () => {
  const layout = layoutEconomica1000x();

  it("o layout não tem erros nem avisos", () => {
    expect(layout.issues).toEqual([]);
  });

  it("a 100x de 45 mm de parafocal deixa o tubo com 152 mm e o suporte com 237,6 mm", () => {
    const d = derived1000x(layout);
    expect(d.tubeLength).toBe(152);
    expect(d.totalHeight).toBeCloseTo(237.57, 2);
    expect(d.workingDistance).toBeCloseTo(0.18, 6);
    // lens tip at the cover glass plus the working distance
    expect(layout.tube.noseZ - layout.samplePlane).toBeCloseTo(0.18 + COVER_GLASS, 6);
  });

  it("o tubo de luz, o dissipador e a íris cabem um dentro do outro", () => {
    const t = layout.lightTube!;
    const p = layout.params;
    expect(t.outerDiameter).toBeCloseTo(48.4, 6);
    expect(t.innerDiameter).toBeCloseTo(p.irisDiameter + p.irisFit, 6);
    expect(p.heatsinkDiameter).toBeLessThan(t.innerDiameter - 4);
    expect(t.stopBore).toBeGreaterThanOrEqual(26);
    expect(t.emitterToIris).toBeGreaterThan(10);
    // everything stays under the ceiling and the iris sits right under the diffuser
    expect(t.top).toBeCloseTo(layout.cavity.top, 6);
    expect(t.irisTop).toBeLessThan(t.top);
    expect(t.emitterTop).toBeLessThan(t.irisBottom);
  });

  it("a placa do driver fica atrás do tubo de luz e dentro da caixa", () => {
    const r = layout.lightTube!.outerDiameter / 2;
    expect(layout.board.yMin).toBeGreaterThanOrEqual(r + 2);
    expect(layout.board.yMax).toBeLessThan(layout.cavity.yMax);
  });

  it("a tampa tem 12 furos de ventilação dentro do anel entre o dissipador e a parede do tubo", () => {
    expect(layout.lid.vents).toHaveLength(12);
    const t = layout.lightTube!;
    for (const v of layout.lid.vents) {
      const r = Math.hypot(v.x, v.y);
      expect(r - v.diameter / 2).toBeGreaterThan(layout.params.heatsinkDiameter / 2);
      expect(r + v.diameter / 2).toBeLessThan(t.innerDiameter / 2);
    }
  });

  it("não tem o porta-LED nem o botão do reostato, mas tem o conector da fonte", () => {
    expect(layout.hasLedPost).toBe(false);
    expect(layout.cutouts.map((c) => c.id).sort()).toEqual(["jack", "slide-channel", "switch", "window"]);
  });

  it("a 400x e a v2 continuam iguais", () => {
    const v2 = holderLayout({ ...DEFAULT_HOLDER_PARAMS, variant: "fonte" });
    expect(v2.totalHeight).toBeCloseTo(228.2, 1);
    expect(v2.hasLedPost).toBe(true);
    expect(v2.lightTube).toBeNull();
    expect(v2.lid.vents).toEqual([]);
  });

  it("toda peça tem origem declarada e as supostas dizem o que medir", () => {
    const list = componentes1000x(layout);
    const ids = list.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ["P9", "D1", "HS1", "DR1", "IR1", "M5", "CV1", "OIL"]) expect(ids).toContain(id);
    for (const c of list) {
      expect(c.dims.length, c.id).toBeGreaterThan(3);
      if (c.evidence === "suposto") expect(c.note.toLowerCase(), c.id).toMatch(/medir|tamanho|suposto/);
    }
  });

  it("o calor do LED a 350 mA é de 0,7 a 1 W", () => {
    const d = derived1000x(layout);
    expect(d.ledWatts).toBeCloseTo(1.21, 2);
    expect(d.heatWatts[0]).toBeGreaterThan(0.6);
    expect(d.heatWatts[1]).toBeLessThan(1.1);
  });

  it("os STL da versão estão no pacote", () => {
    for (const f of ["suporte-base-coluna", "suporte-base-coluna-impressao", "tampa-fundo", "abracadeira-tubo", "tubo-de-luz"]) {
      expect(existsSync(new URL(`../../../pacote-montagem/mecanica/v2-1000x/${f}.stl`, import.meta.url)), f).toBe(true);
    }
  });
});
