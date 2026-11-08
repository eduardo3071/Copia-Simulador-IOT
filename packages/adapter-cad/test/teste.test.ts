import { describe, expect, it } from "vitest";
import {
  NOMINAL_PARTS, SUPPLIES, faultsFor, firstFailure, randomParts, runTest, seededRandom, solveCircuit, opticsAt, tubeVerdict, EXTENSION_FOR_STANDARD, NOMINAL_EXTENSION,
  type FaultId, type SimVersion,
} from "../src/index.ts";

const run = (version: SimVersion, fault: FaultId = "nenhuma", supplyIdx = 0, parts = NOMINAL_PARTS) =>
  runTest({ version, parts, supply: SUPPLIES[version][supplyIdx]!, fault, pot: 0 });

describe("teste elétrico simulado", () => {
  for (const v of ["v1", "v2"] as const) {
    it(`${v}: a montagem correta passa em todos os pontos`, () => {
      const r = run(v);
      expect(r.filter((x) => !x.ok).map((x) => `${x.row.point}: ${x.text}`)).toEqual([]);
    });

    it(`${v}: 2000 conjuntos de peças reais dentro das tolerâncias passam`, () => {
      const rand = seededRandom(7);
      const bad = new Map<string, number>();
      for (let k = 0; k < 2000; k++) {
        for (const x of run(v, "nenhuma", 0, randomParts(rand))) if (!x.ok) bad.set(x.row.point, (bad.get(x.row.point) ?? 0) + 1);
      }
      expect([...bad.entries()]).toEqual([]);
    });

    for (const f of faultsFor(v).filter((x) => x !== "nenhuma")) {
      it(`${v}: a falha "${f}" é detectada`, () => {
        expect(firstFailure(run(v, f))).not.toBeNull();
      });
    }
  }

  it("pilha quase morta perde a regulação e o primeiro ponto fora é a própria pilha", () => {
    const r = run("v1", "nenhuma", 3);
    expect(firstFailure(r)!.row.point).toMatch(/Pilha BT1/);
    expect(solveCircuit({ version: "v1", parts: NOMINAL_PARTS, supply: SUPPLIES.v1[3]!, fault: "nenhuma", pot: 0 }).regulating).toBe(false);
  });

  it("corrente nominal: 18,4 mA na v1 e de 4,3 a 18,4 mA na v2 (mais 0,05 mA do pino ADJ)", () => {
    expect(run("v1")[5]!.value).toBeCloseTo(18.4, 0);
    const v2 = run("v2");
    expect(v2[6]!.value).toBeCloseTo(18.4, 0);
    expect(v2[7]!.value).toBeCloseTo(4.4, 0);
  });
});

describe("óptica do tubo", () => {
  it("160 mm só seria atingido com 45 mm de extensão, e o tubo interno sai 40", () => {
    expect(EXTENSION_FOR_STANDARD).toBe(45);
    expect(opticsAt(40).tubeLength).toBe(155);
    expect(opticsAt(NOMINAL_EXTENSION).tubeLength).toBe(152);
  });
  it("o ocular de 23,2 mm não cabe no tubo interno de 22,5 mm, mas cabe no externo", () => {
    const o = opticsAt(19);
    expect(o.eyepieceFitsInner).toBe(false);
    expect(o.eyepieceFitsOuter).toBe(true);
  });
  it("classifica o comprimento", () => {
    expect(tubeVerdict(160)).toBe("ideal");
    expect(tubeVerdict(150)).toBe("aceitavel");
    expect(tubeVerdict(134)).toBe("curto");
  });
});

import { FLUX_5MM_DIFFUSED_LM, diffuserLuminance, objectiveReport, resolutionUm, tubeTopOverSpecimen, usefulMagnification } from "../src/index.ts";

describe("1000x", () => {
  it("100x/1,25 com ocular de 10x dá 1000x nominais e fica dentro da ampliação útil", () => {
    const r = objectiveReport("100x", "condensador com óleo", 40);
    expect(r.objective.magnification * 10).toBe(1000);
    expect(r.magnificationIsUseful).toBe(true);
    expect(usefulMagnification(1.25)).toEqual({ min: 625, max: 1250 });
  });
  it("sem condensador a resolução teórica piora pouco; o que falta é brilho", () => {
    const sem = objectiveReport("100x", "difusor");
    const com = objectiveReport("100x", "condensador com óleo");
    expect(sem.resolutionUm).toBeGreaterThan(com.resolutionUm);
    expect(sem.resolutionUm).toBeLessThan(com.resolutionUm * 1.25);
    expect(com.resolutionUm).toBeCloseTo(0.27, 2);
    expect(resolutionUm(0.65, 0.65)).toBeCloseTo(0.52, 2);
  });
  it("um LED difuso de 5 mm num disco de 26 mm dá só cerca de 600 cd/m2", () => {
    expect(FLUX_5MM_DIFFUSED_LM).toBeCloseTo(1.01, 1);
    expect(diffuserLuminance(FLUX_5MM_DIFFUSED_LM, 26)).toBeGreaterThan(550);
    expect(diffuserLuminance(FLUX_5MM_DIFFUSED_LM, 26)).toBeLessThan(700);
    expect(diffuserLuminance(100, 26)).toBeCloseTo(diffuserLuminance(1, 26) * 100, 6);
  });
  it("a 40x em 400x não passa da ampliação útil de 0,65 de abertura", () => {
    expect(objectiveReport("40x", "condensador seco").magnificationIsUseful).toBe(true);
  });
  it("o campo cai com a ampliação e um anel de 1,4 µm vira ≈ 1,4 mm a 1000x", () => {
    const r = objectiveReport("100x", "condensador com óleo", 40);
    expect(r.fieldDiameterMm).toBeCloseTo(0.18, 3);
    expect(r.ringMm).toBeGreaterThan(1.2);
    expect(r.redCellMm).toBeGreaterThan(6);
  });
  it("altura do topo do tubo sobre a lâmina para um tubo de 160 mm", () => {
    expect(tubeTopOverSpecimen("100x", 160, 0.18)).toBeCloseTo(205.18, 2);
    expect(tubeTopOverSpecimen("40x", 152, 0.8)).toBeCloseTo(187.8, 1);
  });
});
