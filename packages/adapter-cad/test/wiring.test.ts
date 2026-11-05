import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAD_TO_PIN, PCB, WIRE_SPECS, padAt, routeIsClear, terminals, wires } from "../src/index.ts";

interface FixtureProject {
  components: { id: string; refDes: string }[];
  connections: { a: { componentId: string; pinId: string }; b: { componentId: string; pinId: string } }[];
}

/** Nets of the simulator project: union of every connection, keyed "REF:pin". */
function nets(version: "v1" | "v2") {
  const project = JSON.parse(readFileSync(new URL(`../../../fixtures/suporte-${version}/project.json`, import.meta.url), "utf8")) as FixtureProject;
  const ref = new Map(project.components.map((c) => [c.id, c.refDes]));
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    if (!parent.has(k)) parent.set(k, k);
    const p = parent.get(k)!;
    if (p === k) return k;
    const r = find(p);
    parent.set(k, r);
    return r;
  };
  const pins = new Set<string>();
  for (const c of project.connections) {
    const a = `${ref.get(c.a.componentId)}:${c.a.pinId}`;
    const b = `${ref.get(c.b.componentId)}:${c.b.pinId}`;
    pins.add(a);
    pins.add(b);
    parent.set(find(a), find(b));
  }
  return { find, pins };
}

const external = (part: string, pin: string) => (part === "J1" ? `PS1:${pin}` : `${part}:${pin}`);

describe("fiação do suporte", () => {
  for (const v of ["v1", "v2"] as const) {
    it(`${v}: cada fio liga um terminal externo ao pad da placa que está na mesma rede do esquemático`, () => {
      const { find } = nets(v);
      for (const spec of WIRE_SPECS[v]) {
        const outer = external(spec.part, spec.pin);
        const pad = PAD_TO_PIN[v][spec.pad];
        expect(pad, spec.pad).toBeTruthy();
        expect(find(outer), `${outer} x ${pad}`).toBe(find(pad!));
      }
    });

    it(`${v}: todos os terminais das peças externas recebem exatamente um fio`, () => {
      const { pins } = nets(v);
      const wired = WIRE_SPECS[v].map((s) => external(s.part, s.pin));
      expect(new Set(wired).size).toBe(wired.length);
      const outside = [...pins].filter((p) => /^(BT1|SW1|D1|PS1|RV1):/.test(p));
      for (const p of outside) expect(wired, p).toContain(p);
    });

    it(`${v}: os pads existem na placa e os fios têm rota livre de peças`, () => {
      const half = [PCB[v].width / 2, PCB[v].height / 2];
      for (const s of WIRE_SPECS[v]) {
        const pad = PCB[v].pads[s.pad]!;
        expect(Math.abs(pad[0])).toBeLessThan(half[0]!);
        expect(Math.abs(pad[1])).toBeLessThan(half[1]!);
        expect(padAt(v, s.pad)[2]).toBeCloseTo(7.6, 5);
      }
      const routed = wires(v);
      expect(routed).toHaveLength(WIRE_SPECS[v].length);
      for (const w of routed) {
        expect(routeIsClear(v, w), `${w.spec.part}:${w.spec.pin}`).toBe(true);
        expect(w.path[0]).toEqual(w.from);
        expect(w.path.at(-1)).toEqual(w.to);
      }
      for (const key of Object.keys(terminals(v))) expect(key).toMatch(/^[A-Z0-9]+:/);
    });
  }
});

describe("placa 3D", () => {
  it("suporte-pcb.ts reflete o circuit.json atual de cada placa", () => {
    for (const [v, dir] of [["v1", "v1-pilha"], ["v2", "v2-fonte-dimmer"]] as const) {
      const json = JSON.parse(readFileSync(new URL(`../../../pacote-montagem/eletronica/${dir}/circuit.json`, import.meta.url), "utf8")) as { type: string; x?: number; y?: number }[];
      const holes = json.filter((e) => e.type === "pcb_plated_hole");
      expect(Object.keys(PCB[v].pads)).toHaveLength(holes.length);
      expect(PCB[v].traces.length).toBe(json.filter((e) => e.type === "pcb_trace").length);
    }
  });
});

describe("lista de corte dos fios", () => {
  it("v1 pede cerca de 0,6 m e v2 cerca de 1,3 m, cada fio com folga e múltiplo de 5 mm", async () => {
    const { wireCutList } = await import("../src/index.ts");
    const total = (v: "v1" | "v2") => wireCutList(v).reduce((s, r) => s + r.cut, 0);
    expect(total("v1")).toBe(610);
    expect(total("v2")).toBe(1265);
    for (const v of ["v1", "v2"] as const) {
      for (const r of wireCutList(v)) {
        expect(r.cut % 5).toBe(0);
        expect(r.cut).toBeGreaterThan(r.path + 12);
      }
    }
  });
});

describe("pads e rede esperada", () => {
  it("todo pad da placa tem um pino do esquemático", async () => {
    const { PAD_PIN } = await import("../src/index.ts");
    for (const v of ["v1", "v2"] as const) {
      expect(Object.keys(PAD_PIN[v]).sort()).toEqual(Object.keys(PCB[v].pads).sort());
      const { pins } = nets(v);
      for (const pin of Object.values(PAD_PIN[v])) expect(pins.has(pin), `${v} ${pin}`).toBe(true);
    }
  });
});
