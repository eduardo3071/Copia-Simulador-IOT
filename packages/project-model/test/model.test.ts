import { describe, expect, it } from "vitest";
import {
  applyCommand,
  circuitInputsKey,
  createHistory,
  CommandError,
  createProject,
  DEFAULT_ENCLOSURE_PARAMS,
  enclosureInputsKey,
  enclosureIsStale,
  execute,
  firmwareInputsKey,
  markEnclosureGenerated,
  migrate,
  MigrationError,
  redo,
  undo,
  type ComponentInstance,
  type Cutout,
  type Project,
} from "../src/index.ts";

const resistor = (id: string): ComponentInstance => ({
  id,
  definitionId: "resistor",
  definitionVersion: 1,
  refDes: "R1",
  params: { resistance: 220 },
});

function withTwoParts(): Project {
  let p = createProject("Teste", new Date("2026-01-01T00:00:00Z"));
  p = applyCommand(p, { type: "addComponent", component: resistor("cmp_r1"), placement: { x: 10, y: 20, rotation: 0 } });
  p = applyCommand(p, {
    type: "addComponent",
    component: { id: "cmp_d1", definitionId: "led", definitionVersion: 1, refDes: "D1", params: { color: "red" } },
    placement: { x: 50, y: 20, rotation: 0 },
  });
  p = applyCommand(p, {
    type: "connect",
    connection: { id: "conn_1", kind: "wire", a: { componentId: "cmp_r1", pinId: "2" }, b: { componentId: "cmp_d1", pinId: "A" } },
  });
  return p;
}

describe("project model", () => {
  it("round-trips through JSON and migrate() without loss", () => {
    const project = withTwoParts();
    const reloaded = migrate(JSON.parse(JSON.stringify(project)));
    expect(reloaded).toEqual(project);
  });

  it("rejects documents from the future or without version", () => {
    expect(() => migrate({ ...withTwoParts(), schemaVersion: 99 })).toThrow(MigrationError);
    expect(() => migrate({ title: "x" })).toThrow(MigrationError);
  });

  it("increments revision on every effective edit", () => {
    const p = withTwoParts();
    expect(p.revision).toBe(3);
    const same = applyCommand(p, {
      type: "connect",
      connection: { id: "conn_2", kind: "wire", a: { componentId: "cmp_d1", pinId: "A" }, b: { componentId: "cmp_r1", pinId: "2" } },
    });
    expect(same).toBe(p); // duplicate connection is a no-op
  });

  it("keeps ids and connectivity when moving components", () => {
    const p = withTwoParts();
    const moved = applyCommand(p, { type: "moveComponent", view: "breadboard", componentId: "cmp_r1", placement: { x: 300, y: 300, rotation: 90 } });
    expect(moved.components.map((c) => c.id)).toEqual(p.components.map((c) => c.id));
    expect(moved.connections).toEqual(p.connections);
    // moving on the breadboard must not invalidate schematic/PCB results
    expect(circuitInputsKey(moved)).toBe(circuitInputsKey(p));
  });

  it("removing a component removes its connections and layout entries", () => {
    const p = applyCommand(withTwoParts(), { type: "removeComponent", componentId: "cmp_r1" });
    expect(p.connections).toHaveLength(0);
    expect(p.breadboard.placements.cmp_r1).toBeUndefined();
    expect(p.breadboard.wires.conn_1).toBeUndefined();
  });

  it("firmware key changes only with firmware inputs", () => {
    const p = withTwoParts();
    const key = firmwareInputsKey(p);
    const moved = applyCommand(p, { type: "moveComponent", view: "breadboard", componentId: "cmp_d1", placement: { x: 0, y: 0, rotation: 0 } });
    expect(firmwareInputsKey(moved)).toBe(key);
    const edited = applyCommand(p, { type: "editSource", path: "sketch.ino", content: "void setup(){} void loop(){}" });
    expect(firmwareInputsKey(edited)).not.toBe(key);
  });

  it("undo/redo restore content while revision keeps increasing", () => {
    let h = createHistory(withTwoParts());
    h = execute(h, { type: "setParam", componentId: "cmp_r1", key: "resistance", value: 1000 });
    const editedRevision = h.present.revision;
    h = undo(h);
    expect(h.present.components[0]!.params.resistance).toBe(220);
    expect(h.present.revision).toBeGreaterThan(editedRevision);
    h = redo(h);
    expect(h.present.components[0]!.params.resistance).toBe(1000);
  });

  it("coalesces consecutive edits with the same key into one undo step", () => {
    let h = createHistory(withTwoParts());
    for (const text of ["a", "ab", "abc"]) {
      h = execute(h, { type: "editSource", path: "sketch.ino", content: text }, { coalesceKey: "src:sketch.ino" });
    }
    expect(h.past).toHaveLength(1);
    h = undo(h);
    expect(h.present.firmware.files[0]!.content).toContain("pinMode");
  });
});
describe("enclosure", () => {
  const usb: Cutout = { id: "cut_usb", label: "USB", face: "front", shape: "rect", x: -10, y: 0, z: 5, width: 12, height: 11 };
  const withEnclosure = () => applyCommand(withTwoParts(), { type: "createEnclosure" });

  it("migrates a v1 document to v2 without an enclosure", () => {
    const { enclosure: _none, ...v1 } = { ...withTwoParts(), schemaVersion: 1 };
    const migrated = migrate(JSON.parse(JSON.stringify(v1)));
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.enclosure).toBeNull();
    expect(migrated.components).toEqual(withTwoParts().components);
  });

  it("round-trips an enclosure with cutouts through migrate()", () => {
    const p = applyCommand(withEnclosure(), { type: "addCutout", cutout: usb });
    expect(migrate(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it("creates with defaults and fitted to the current PCB", () => {
    const p = withEnclosure();
    expect(p.enclosure?.params).toEqual(DEFAULT_ENCLOSURE_PARAMS);
    expect(p.enclosure?.pcbInputsKey).toBe(enclosureInputsKey(p));
    expect(enclosureIsStale(p)).toBe(false);
    expect(() => applyCommand(p, { type: "createEnclosure" })).toThrow(CommandError);
  });

  it("edits parameters and cutouts as undoable commands with validation", () => {
    let h = createHistory(withEnclosure());
    h = execute(h, { type: "setEnclosureParams", params: { wall: 3 } });
    h = execute(h, { type: "addCutout", cutout: usb });
    h = execute(h, { type: "updateCutout", cutoutId: "cut_usb", changes: { width: 14 } });
    expect(h.present.enclosure?.params.wall).toBe(3);
    expect(h.present.enclosure?.cutouts[0]?.width).toBe(14);
    h = undo(h);
    expect(h.present.enclosure?.cutouts[0]?.width).toBe(12);
    expect(() => applyCommand(h.present, { type: "setEnclosureParams", params: { wall: -1 } })).toThrow(CommandError);
    expect(() => applyCommand(h.present, { type: "updateCutout", cutoutId: "cut_usb", changes: { height: 0 } })).toThrow(CommandError);
    expect(() => applyCommand(h.present, { type: "addCutout", cutout: usb })).toThrow(CommandError);
    const removed = applyCommand(h.present, { type: "removeCutout", cutoutId: "cut_usb" });
    expect(removed.enclosure?.cutouts).toEqual([]);
  });

  it("becomes stale when the PCB changes, not when other views or the enclosure change", () => {
    const p = applyCommand(withEnclosure(), { type: "addCutout", cutout: usb });
    const key = enclosureInputsKey(p);
    const breadboard = applyCommand(p, { type: "moveComponent", view: "breadboard", componentId: "cmp_r1", placement: { x: 1, y: 2, rotation: 0 } });
    const code = applyCommand(p, { type: "editSource", path: "sketch.ino", content: "void setup(){} void loop(){}" });
    const params = applyCommand(p, { type: "setEnclosureParams", params: { headroom: 30 } });
    for (const other of [breadboard, code, params]) {
      expect(enclosureInputsKey(other)).toBe(key);
      expect(enclosureIsStale(other)).toBe(false);
    }
    const resized = applyCommand(p, { type: "setBoardSize", width: 80, height: 60 });
    const moved = applyCommand(p, { type: "moveComponent", view: "pcb", componentId: "cmp_r1", placement: { x: 5, y: 5, rotation: 0 } });
    expect(enclosureIsStale(resized)).toBe(true);
    expect(enclosureIsStale(moved)).toBe(true);
    // regenerating records the new PCB without a new revision
    const regenerated = markEnclosureGenerated(resized);
    expect(enclosureIsStale(regenerated)).toBe(false);
    expect(regenerated.revision).toBe(resized.revision);
    expect(regenerated.enclosure?.sourceRevision).toBe(resized.revision);
  });
});