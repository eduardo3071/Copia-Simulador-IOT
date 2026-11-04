/**
 * Where every wire of the light goes. Pads come from the real driver board (`suporte-pcb.ts`, generated from the Gerber
 * source), the terminals of the panel parts from the printed cut-outs, and each wire is routed around the parts so it does
 * not pass through any of them. Everything is in the lid frame: origin on the tube axis, z = 0 on the lid's top face.
 */
import { DEFAULT_HOLDER_PARAMS, holderLayout } from "./holder.ts";
import { PCB } from "./suporte-pcb.ts";
import type { SuporteVersion } from "./suporte-catalog.ts";

import type { Vec3 } from "./layout.ts";

export interface WireSpec {
  /** Part that carries the free end ("BT1", "SW1", "D1", "J1", "RV1"). */
  part: string;
  /** Pin in the simulator project (fixtures/suporte-*): "+", "1.l", "A", ... */
  pin: string;
  /** Pad of the driver board the wire is soldered to ("BT1.POS"). */
  pad: string;
  color: string;
}

export const WIRE_SPECS: Record<SuporteVersion, WireSpec[]> = {
  v1: [
    { part: "D1", pin: "A", pad: "D1.ANODO", color: "#ff8a1f" },
    { part: "D1", pin: "C", pad: "D1.CATODO", color: "#222222" },
    { part: "BT1", pin: "+", pad: "BT1.POS", color: "#d92d20" },
    { part: "BT1", pin: "-", pad: "BT1.NEG", color: "#222222" },
    { part: "SW1", pin: "1.l", pad: "SW1.A", color: "#d92d20" },
    { part: "SW1", pin: "2.l", pad: "SW1.B", color: "#ff8a1f" },
  ],
  v2: [
    { part: "D1", pin: "A", pad: "D1.ANODO", color: "#ff8a1f" },
    { part: "D1", pin: "C", pad: "D1.CATODO", color: "#222222" },
    { part: "J1", pin: "+", pad: "J1.VIN", color: "#d92d20" },
    { part: "J1", pin: "-", pad: "J1.GND", color: "#222222" },
    { part: "SW1", pin: "1.l", pad: "SW1.A", color: "#d92d20" },
    { part: "SW1", pin: "2.l", pad: "SW1.B", color: "#ff8a1f" },
    { part: "RV1", pin: "GND", pad: "RV1.pin1", color: "#e0c200" },
    { part: "RV1", pin: "SIG", pad: "RV1.pin2", color: "#2e9e4f" },
    { part: "RV1", pin: "VCC", pad: "RV1.pin3", color: "#2f6fdb" },
  ],
};

/** Pin of the simulator project that a board pad stands for (the jack J1 is the supply PS1 plugged in). */
export const PAD_TO_PIN: Record<SuporteVersion, Record<string, string>> = {
  v1: { "BT1.POS": "BT1:+", "BT1.NEG": "BT1:-", "SW1.A": "SW1:1.l", "SW1.B": "SW1:2.l", "D1.ANODO": "D1:A", "D1.CATODO": "D1:C" },
  v2: { "J1.VIN": "PS1:+", "J1.GND": "PS1:-", "SW1.A": "SW1:1.l", "SW1.B": "SW1:2.l", "D1.ANODO": "D1:A", "D1.CATODO": "D1:C", "RV1.pin1": "RV1:GND", "RV1.pin2": "RV1:SIG", "RV1.pin3": "RV1:VCC" },
};

export interface Terminal {
  at: Vec3;
  /** Direction the wire leaves the part. */
  exit: Vec3;
  /** Radius (mm) around the terminal that is not checked for collisions. */
  free: number;
}

export interface Obstacle {
  id: string;
  min: Vec3;
  max: Vec3;
}

export interface RoutedWire {
  id: string;
  spec: WireSpec;
  from: Vec3;
  to: Vec3;
  /** Control points of the smooth curve, start to end. */
  path: Vec3[];
}

const EXIT_STUB = 3.5;
/** Wire radius plus the air that keeps it off the parts. */
const CLEARANCE = 1.1;

function frame(version: SuporteVersion) {
  const layout = holderLayout({ ...DEFAULT_HOLDER_PARAMS, variant: version === "v1" ? "pilha" : "fonte" });
  const { board } = layout;
  return {
    layout,
    p: layout.params,
    cx: (board.xMin + board.xMax) / 2,
    cy: (board.yMin + board.yMax) / 2,
    top: board.standoffHeight + 1.6,
  };
}

/** Position of a board pad in the lid frame, on the board's top face. */
export function padAt(version: SuporteVersion, key: string): Vec3 {
  const { cx, cy, top } = frame(version);
  const pad = PCB[version].pads[key];
  if (!pad) throw new Error(`pad ${key} not on the ${version} board`);
  return [round(cx + pad[0]), round(cy + pad[1]), top];
}

/** Where a part of the board sits: the midpoint of its pads (or of the named ones). */
export function boardPartAt(version: SuporteVersion, ref: string): Vec3 {
  const { cx, cy, top } = frame(version);
  const part = PCB[version].parts[ref];
  if (!part) throw new Error(`${ref} not on the ${version} board`);
  return [round(cx + part.x), round(cy + part.y), top];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Free ends of the parts that are not on the board. */
export function terminals(version: SuporteVersion): Record<string, Terminal> {
  const { layout, p } = frame(version);
  const wallIn = layout.box.yMin + p.wall;
  const swX = p.switchCutout.x;
  const out: Record<string, Terminal> = {
    "SW1:1.l": { at: [swX - 3.5, wallIn + 19, 17], exit: [0, 1, 0], free: 3 },
    "SW1:2.l": { at: [swX + 3.5, wallIn + 19, 17], exit: [0, 1, 0], free: 3 },
  };
  const slot = layout.ledPost.slot.dir;
  // the legs end in the hole of the LED post, 3 mm above the lid; the wires leave sideways through the slot
  out["D1:A"] = { at: [1.27, 0, 3], exit: [0, slot, 0], free: 8 };
  out["D1:C"] = { at: [-1.27, 0, 3], exit: [0, slot, 0], free: 8 };
  if (version === "v1") {
    const y = p.batteryY - 12.25;
    out["BT1:+"] = { at: [-21, y, 21.5], exit: [0, -1, 0], free: 3 };
    out["BT1:-"] = { at: [-16, y, 21.5], exit: [0, -1, 0], free: 3 };
  } else {
    const xIn = layout.box.xMax - p.wall;
    out["J1:+"] = { at: [xIn - 19, p.jackY + 3.2, 17], exit: [-1, 0, 0], free: 3 };
    out["J1:-"] = { at: [xIn - 19, p.jackY - 3.2, 17], exit: [-1, 0, 0], free: 3 };
    const kx = p.knobX;
    out["RV1:GND"] = { at: [kx - 5, wallIn + 14, 12], exit: [0, 1, 0], free: 3 };
    out["RV1:SIG"] = { at: [kx, wallIn + 14, 12], exit: [0, 1, 0], free: 3 };
    out["RV1:VCC"] = { at: [kx + 5, wallIn + 14, 12], exit: [0, 1, 0], free: 3 };
  }
  return out;
}

const box = (id: string, c: Vec3, s: Vec3): Obstacle => ({ id, min: [c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2], max: [c[0] + s[0] / 2, c[1] + s[1] / 2, c[2] + s[2] / 2] });

/** Everything a wire must stay away from. */
export function obstacles(version: SuporteVersion): Obstacle[] {
  const { layout, p, top } = frame(version);
  const u1 = padAt(version, "U1.OUT");
  const c1a = padAt(version, "C1.pin1");
  const c1b = padAt(version, "C1.pin2");
  const r1a = padAt(version, "R1.pin1");
  const r1b = padAt(version, "R1.pin2");
  const out: Obstacle[] = [
    box("U1", [u1[0], u1[1], top + 13], [10.4, 5, 26]),
    box("C1", [(c1a[0] + c1b[0]) / 2, (c1a[1] + c1b[1]) / 2, top + 3.2], [7.6, 3.4, 6.4]),
    box("R1", [(r1a[0] + r1b[0]) / 2, (r1a[1] + r1b[1]) / 2, top + 2.2], [10.4, 3, 4.4]),
    box("LED", [0, 0, 18], [layout.ledPost.diameter, layout.ledPost.diameter, 36]),
  ];
  if (version === "v2") {
    const d2a = padAt(version, "D2.pin1");
    const d2b = padAt(version, "D2.pin2");
    out.push(box("D2", [(d2a[0] + d2b[0]) / 2, (d2a[1] + d2b[1]) / 2, top + 2.2], [10.4, 3.2, 4.4]));
  }
  const wallIn = layout.box.yMin + p.wall;
  out.push(box("SW1", [p.switchCutout.x, wallIn + 7, 20], [20.6, 14, 14.6]));
  if (version === "v1" && layout.cradle) out.push(box("BT1", [0, p.batteryY, 13], [49.6, 28.4, 26]));
  if (version === "v2") {
    out.push(box("J1", [layout.box.xMax - p.wall - 7, p.jackY, 17.5], [14, 11, 11]));
    out.push(box("RV1", [p.knobX, wallIn + 4.5, 20], [17, 9, 17]));
  }
  return out;
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function hits(path: Vec3[], obs: Obstacle[], start: Vec3, end: Vec3, free: number): string | null {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const steps = Math.max(2, Math.ceil(dist(a, b) / 0.4));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const pt: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      if (dist(pt, start) < free || dist(pt, end) < 1.6) continue;
      for (const o of obs) {
        if (pt[0] > o.min[0] - CLEARANCE && pt[0] < o.max[0] + CLEARANCE && pt[1] > o.min[1] - CLEARANCE && pt[1] < o.max[1] + CLEARANCE && pt[2] > o.min[2] - CLEARANCE && pt[2] < o.max[2] + CLEARANCE) return o.id;
      }
      // inside the closed box: walls at 2.4 mm, roof under the window
      if (Math.abs(pt[0]) > 41.2 || pt[1] < -41.2 || pt[1] > 66.2 || pt[2] > 34.5 || pt[2] < 1.4) return "caixa";
    }
  }
  return null;
}

const CORRIDORS = [3.5, 6, 9, 12, 15, 18, 22, 26, 30];

/** Smooth wires between each free terminal and its pad, on the lowest height that is free of parts. */
export function wires(version: SuporteVersion): RoutedWire[] {
  const terms = terminals(version);
  const obs = obstacles(version);
  const used: number[] = [];
  return WIRE_SPECS[version].map((spec, index) => {
    const t = terms[`${spec.part}:${spec.pin}`];
    if (!t) throw new Error(`terminal ${spec.part}:${spec.pin} missing`);
    const end = padAt(version, spec.pad);
    const to: Vec3 = [end[0], end[1], end[2] + 0.6];
    const stub: Vec3 = [t.at[0] + t.exit[0] * EXIT_STUB, t.at[1] + t.exit[1] * EXIT_STUB, t.at[2] + t.exit[2] * EXIT_STUB];
    const candidates: { path: Vec3[]; cost: number; zc: number }[] = [];
    for (const zc of CORRIDORS) {
      const p1: Vec3 = [stub[0], stub[1], zc];
      const p3: Vec3 = [to[0], to[1], zc];
      const above: Vec3 = [to[0], to[1], Math.max(zc, to[2] + 2.5)];
      const shapes: Vec3[][] = [
        [p1, p3],
        [p1, [p1[0], p3[1], zc], p3],
        [p1, [p3[0], p1[1], zc], p3],
      ];
      for (const mid of shapes) {
        const path: Vec3[] = [t.at, stub, ...mid, above, to];
        let length = 0;
        for (let i = 0; i < path.length - 1; i++) length += dist(path[i]!, path[i + 1]!);
        candidates.push({ path, zc, cost: length + 0.6 * Math.abs(zc - t.at[2]) + 0.3 * zc + (used.includes(zc) ? 4 : 0) });
      }
    }
    candidates.sort((a, b) => a.cost - b.cost);
    for (const c of candidates) {
      if (!hits(c.path, obs, t.at, to, t.free)) {
        used.push(c.zc);
        return { id: `W1-${index + 1}`, spec, from: t.at, to, path: c.path };
      }
    }
    throw new Error(`no free route for ${spec.part}:${spec.pin}`);
  });
}

/** True when the polyline is clear of every obstacle (used by the tests and by the 3D check). */
export function routeIsClear(version: SuporteVersion, wire: RoutedWire): boolean {
  const t = terminals(version)[`${wire.spec.part}:${wire.spec.pin}`]!;
  return hits(wire.path, obstacles(version), wire.from, wire.to, t.free) === null;
}
