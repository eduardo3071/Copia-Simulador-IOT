import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map";
import type { AnyCircuitElement } from "circuit-json";
import { applyCommand, migrate, type Project } from "@simiot/project-model";
import { buildNetlist } from "@simiot/netlist";
import { edaNetName, fabricationFiles, projectToCircuitJson } from "../src/index.ts";

const load = (name: string) => migrate(JSON.parse(readFileSync(new URL(`../../../fixtures/${name}/project.json`, import.meta.url), "utf8")));

type El = AnyCircuitElement & Record<string, any>;

function sourcePortId(cj: El[], componentName: string, portName: string): string | undefined {
  const component = cj.find((e) => e.type === "source_component" && e.name === componentName);
  return cj.find((e) => e.type === "source_port" && e.source_component_id === component?.source_component_id && (e.name === portName || e.port_hints?.includes(portName)))?.source_port_id;
}

describe("EDA adapter", () => {
  it("sanitises net names", () => {
    expect(edaNetName("5V")).toBe("V5");
    expect(edaNetName("3.3V")).toBe("V3V3");
    expect(edaNetName("D13")).toBe("D13");
  });

  it("preserves every project net on the board (button-led)", async () => {
    const project = load("button-led");
    const result = await projectToCircuitJson(project);
    const cj = result.circuitJson as El[];
    expect(result.sourceRevision).toBe(project.revision);
    expect(result.parts.map((p) => p.name).sort()).toEqual(["D1", "J_U1", "R1", "SW1"]);

    const connectivity = getFullConnectivityMapFromCircuitJson(cj);
    expect(Object.keys(result.nets).length).toBeGreaterThan(0);
    for (const [netId, refs] of Object.entries(result.nets)) {
      const ids = refs.map((ref) => {
        const [part, port] = ref.split(".");
        const id = sourcePortId(cj, part!, port!);
        expect(id, `${netId}: ${ref}`).toBeDefined();
        return id!;
      });
      for (const id of ids.slice(1)) expect(connectivity.areIdsConnected(ids[0]!, id), `${netId}: ${ids[0]} ~ ${id}`).toBe(true);
    }

    // the switch contacts are on different nets (legs with the same number are tied inside)
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);

    // nets that are distinct in the project stay distinct on the board
    const d13 = sourcePortId(cj, "R1", "pin1")!;
    const gnd = sourcePortId(cj, "D1", "pin2")!;
    expect(connectivity.areIdsConnected(d13, gnd)).toBe(false);

    // the project and the board agree on the D13 net: header pin, then resistor
    const netlist = buildNetlist(project);
    expect(netlist.netOf.get("cmp_r1:1")).toBe("D13");
    const header = result.parts.find((p) => p.name === "J_U1")!;
    expect(result.nets.D13).toEqual(expect.arrayContaining(["R1.pin1", `J_U1.${header.ports["13"]}`]));
  }, 120_000);

  it("gives every part pin a PCB pad and routes the traces", async () => {
    const result = await projectToCircuitJson(load("blink"));
    const cj = result.circuitJson as El[];
    for (const part of result.parts) {
      for (const port of Object.values(part.ports)) {
        const id = sourcePortId(cj, part.name, port);
        expect(cj.some((e) => e.type === "pcb_port" && e.source_port_id === id), `${part.name}.${port}`).toBe(true);
      }
    }
    expect(cj.filter((e) => e.type === "pcb_trace").length).toBeGreaterThan(0);
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  }, 120_000);

  it("ties the button legs that are 6.5 mm apart (standard tactile switch)", async () => {
    const result = await projectToCircuitJson(load("button-led"));
    const cj = result.circuitJson as El[];
    const pad = (port: string) => cj.find((e) => e.type === "pcb_port" && e.source_port_id === sourcePortId(cj, "SW1", port))!;
    const dist = (a: string, b: string) => Math.hypot(pad(a).x - pad(b).x, pad(a).y - pad(b).y);
    expect(dist("pin1", "pin2")).toBeCloseTo(6.5, 1);
    expect(dist("pin3", "pin4")).toBeCloseTo(6.5, 1);
  }, 120_000);

  it("leaves the breadboard off the PCB and explains the Uno connector", async () => {
    const result = await projectToCircuitJson(load("blink"));
    const cj = result.circuitJson as El[];
    expect(cj.some((e) => e.type === "source_component" && e.name === "BB1")).toBe(false);
    expect(result.notes.join("\n")).toMatch(/conector J_U1/);
  }, 120_000);

  it("uses explicit PCB placements when every part has one", async () => {
    let project: Project = load("blink");
    const spots: Record<string, [number, number]> = { cmp_uno: [-15, 0], cmp_r1: [0, 8], cmp_d1: [12, 8] };
    for (const [id, [x, y]] of Object.entries(spots)) {
      project = applyCommand(project, { type: "moveComponent", view: "pcb", componentId: id, placement: { x, y, rotation: 0 } });
    }
    const result = await projectToCircuitJson(project);
    expect(result.autoPlaced).toBe(false);
    const cj = result.circuitJson as El[];
    const r1 = cj.find((e) => e.type === "source_component" && e.name === "R1");
    const pcbR1 = cj.find((e) => e.type === "pcb_component" && e.source_component_id === r1?.source_component_id);
    expect(pcbR1?.center).toMatchObject({ x: 0, y: 8 });
  }, 120_000);

  it("exports gerbers, drill, BOM and pick-and-place stamped with the revision", async () => {
    const project = load("blink");
    const result = await projectToCircuitJson(project);
    const files = await fabricationFiles(result.circuitJson, { title: project.title, revision: project.revision });
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.startsWith("gerber/"))).toBe(true);
    expect(paths).toEqual(expect.arrayContaining(["bom.csv", "pick-and-place.csv", "circuit.json"]));
    for (const file of files.filter((f) => f.path !== "circuit.json")) {
      expect(file.content, file.path).toContain(`revisão ${project.revision}`);
    }
    expect(files.find((f) => f.path === "bom.csv")!.content).toMatch(/R1/);
  }, 120_000);
});

describe("EDA adapter: new parts", () => {
  it.each(["sensores-lcd", "ultrassom-servo", "luz-rgb", "contador-7seg"])("%s: every net preserved, every pin has a pad, no errors", async (name) => {
    const result = await projectToCircuitJson(load(name));
    const cj = result.circuitJson as El[];
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const connectivity = getFullConnectivityMapFromCircuitJson(cj);
    for (const [netId, refs] of Object.entries(result.nets)) {
      const ids = refs.map((ref) => {
        const [part, port] = ref.split(".");
        const id = sourcePortId(cj, part!, port!);
        expect(id, `${name} ${netId}: ${ref}`).toBeDefined();
        expect(cj.some((e) => e.type === "pcb_port" && e.source_port_id === id), `${ref} pad`).toBe(true);
        return id!;
      });
      for (const id of ids.slice(1)) expect(connectivity.areIdsConnected(ids[0]!, id), `${name} ${netId}`).toBe(true);
    }
  }, 180_000);

  it("7-segment: segment A is pad 7 and both commons are tied inside", async () => {
    const result = await projectToCircuitJson(load("contador-7seg"));
    const seg = result.parts.find((p) => p.componentId === "cmp_seg")!;
    expect(seg.ports.A).toBe("pin7");
    expect(seg.ports["COM.1"]).toBe("pin3");
    expect(seg.ports["COM.2"]).toBe("pin8");
  }, 180_000);

  it("modules become headers with all their pins", async () => {
    const result = await projectToCircuitJson(load("sensores-lcd"));
    const lcd = result.parts.find((p) => p.componentId === "cmp_lcd")!;
    expect(lcd.name).toBe("J_LCD1");
    expect(Object.keys(lcd.ports)).toHaveLength(16);
    expect(result.notes.join("\n")).toMatch(/conector J_LCD1 com 16 pinos/);
  }, 180_000);
});