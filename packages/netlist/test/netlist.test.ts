import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrate } from "@simiot/project-model";
import { buildNetlist, netOfTerminal } from "../src/index.ts";

const load = (name: string) => migrate(JSON.parse(readFileSync(new URL(`../../../fixtures/${name}/project.json`, import.meta.url), "utf8")));

describe("netlist", () => {
  it("joins wires, breadboard strips and contacts into nets (blink)", () => {
    const netlist = buildNetlist(load("blink"));
    expect(netlist.issues).toEqual([]);
    const net = (c: string, p: string) => netOfTerminal(netlist, c, p);
    // D13 -> 10a; R1 leg in 10c (same strip)
    expect(net("cmp_r1", "1")).toBe("D13");
    // R1 leg 2 in 16c and LED anode in 16e share column 16
    expect(net("cmp_r1", "2")).toBe(net("cmp_d1", "A"));
    expect(net("cmp_d1", "A")).toMatch(/^N\d+$/);
    // LED cathode 15e -> 15a -> top ground rail -> Uno GND
    expect(net("cmp_d1", "C")).toBe("GND");
    expect(net("cmp_uno", "GND.1")).toBe("GND");
  });

  it("names nets deterministically regardless of connection order", () => {
    const project = load("button-led");
    const reversed = { ...project, connections: [...project.connections].reverse() };
    const a = buildNetlist(project).nets.map((n) => [n.id, n.terminals.length]);
    const b = buildNetlist(reversed).nets.map((n) => [n.id, n.terminals.length]);
    expect(b).toEqual(a);
  });

  it("ties internally connected legs (button sides)", () => {
    const netlist = buildNetlist(load("button-led"));
    expect(netOfTerminal(netlist, "cmp_sw1", "1.r")).toBe("D2");
    expect(netOfTerminal(netlist, "cmp_sw1", "2.l")).toBe("GND");
  });

  it("reports a power-to-ground short", () => {
    const project = load("pot-adc");
    const shorted = {
      ...project,
      connections: [...project.connections, { id: "conn_x", kind: "wire" as const, a: { componentId: "cmp_uno", pinId: "5V" }, b: { componentId: "cmp_uno", pinId: "GND.1" } }],
    };
    expect(buildNetlist(shorted).issues.join()).toMatch(/Curto-circuito/);
  });
});