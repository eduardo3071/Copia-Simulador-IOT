import { describe, expect, it } from "vitest";
import {
  NETS_1000X, WIRES_1000X, d2Placement, routeIsClear1000x, routeWires1000x, terminals1000x, wireCutList1000x, wires1000x, layoutEconomica1000x,
} from "../src/index.ts";

describe("parte elétrica da versão 1000x", () => {
  it("cada pino está em uma única rede e todo fio liga dois pinos da mesma rede", () => {
    const owner = new Map<string, string>();
    for (const n of NETS_1000X) {
      for (const pin of n.pins) {
        expect(owner.has(pin), `${pin} em duas redes`).toBe(false);
        owner.set(pin, n.id);
      }
    }
    for (const w of WIRES_1000X) {
      expect(owner.get(w.from), `${w.id} de ${w.from}`).toBe(w.net);
      expect(owner.get(w.to), `${w.id} para ${w.to}`).toBe(w.net);
    }
  });

  it("os fios, mais o contato direto do D2 no conector, fecham cada rede sem curto nem aberto", () => {
    // union-find over pins: wires join their two ends; the anode of D2 is soldered straight to the + lug of the jack
    const parent = new Map<string, string>();
    const find = (a: string): string => (parent.get(a) === a || !parent.has(a) ? (parent.set(a, a), a) : find(parent.get(a)!));
    const union = (a: string, b: string) => parent.set(find(a), find(b));
    for (const w of WIRES_1000X) union(w.from, w.to);
    union("J1:+", "D2:A");
    for (const n of NETS_1000X) {
      const roots = new Set(n.pins.map(find));
      expect(roots.size, `${n.id} aberta`).toBe(1);
    }
    const rootOf = new Map(NETS_1000X.map((n) => [find(n.pins[0]!), n.id]));
    expect(rootOf.size, "curto entre redes").toBe(NETS_1000X.length);
  });

  it("o ânodo do D2 está no terminal + do conector e o cátodo é o terminal livre", () => {
    const d2 = d2Placement();
    const t = terminals1000x();
    expect(t["J1:+"]!.at).toEqual(d2.anode);
    expect(t["D2:K"]!.at).toEqual(d2.cathode);
    expect(Math.hypot(d2.cathode[0] - d2.anode[0], d2.cathode[1] - d2.anode[1])).toBeGreaterThan(10);
  });

  it("os cinco fios guardados passam livres de todas as peças", () => {
    const w = wires1000x();
    expect(w).toHaveLength(5);
    for (const x of w) expect(routeIsClear1000x(x), x.spec.id).toBe(true);
  });

  it("os fios do LED entram no tubo de luz pela fenda do pé e sobem até a estrela", () => {
    const l = layoutEconomica1000x();
    const slot = l.lightTube!.slot;
    for (const id of ["F4", "F5"]) {
      const w = wires1000x().find((x) => x.spec.id === id)!;
      const inTube = w.path.filter((p) => Math.hypot(p[0], p[1]) < l.lightTube!.innerDiameter / 2 - 1);
      expect(inTube.length, id).toBeGreaterThan(0);
      // the crossing of the wall happens low and inside the slot
      const wall = w.path.filter((p) => Math.hypot(p[0], p[1]) > l.lightTube!.innerDiameter / 2 - 1 && Math.hypot(p[0], p[1]) < l.lightTube!.outerDiameter / 2 + 1);
      for (const p of wall) {
        expect(Math.abs(p[0]), `${id} x`).toBeLessThanOrEqual(slot.halfWidth);
        expect(p[2], `${id} z`).toBeLessThanOrEqual(slot.height);
      }
      // ... and it ends on the pad of the star
      expect(w.path[w.path.length - 1]![2]).toBeGreaterThan(l.lightTube!.heatsinkTop);
    }
  });

  it("a lista de corte: dois fios no painel com folga de 70 mm, o do LED com 15 mm, em passos de 5 mm", () => {
    const cut = wireCutList1000x();
    expect(cut).toHaveLength(5);
    for (const r of cut) {
      expect(r.cut % 5).toBe(0);
      expect(r.cut).toBeGreaterThan(r.path + 12);
    }
    const w1 = cut.find((r) => r.id === "F1")!;
    expect(w1.cut).toBe(Math.ceil((w1.path + 12 + 70) / 5) * 5);
    const w4 = cut.find((r) => r.id === "F4")!;
    expect(w4.cut).toBe(Math.ceil((w4.path + 12 + 15) / 5) * 5);
    expect(cut.reduce((s, r) => s + r.cut, 0)).toBeLessThan(1000);
  });

  it("os caminhos guardados são os que o roteador acha agora", () => {
    const fresh = routeWires1000x();
    const stored = wires1000x();
    for (let i = 0; i < fresh.length; i++) expect(stored[i]!.path, fresh[i]!.spec.id).toEqual(fresh[i]!.path);
  }, 60000);
});
