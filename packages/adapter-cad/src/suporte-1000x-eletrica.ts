/**
 * Electrical part of the economical 1000x version: what is connected to what, where each terminal is in the box, and the five wires
 * routed around the parts. Frame of the lid: origin on the tube axis, z = 0 on the top face of the lid (same as suporte-wiring.ts).
 *
 *   J1 (+) --D2--> SW1 --> DR1 IN+      J1 (-) --> DR1 IN-      DR1 LED+ --> D1 (+)      DR1 LED- --> D1 (-)
 *
 * D2 (1N5819) has its anode soldered straight to the + lug of the jack, so only five wires are cut. DR1 is one constant-current driver
 * module for 12 V in and 350 mA out (see docs/projeto-1000x.md for the two-module alternative).
 */
import { layoutEconomica1000x } from "./suporte-1000x.ts";
import { FIOS_1000X } from "./suporte-1000x-fios.ts";
import type { Vec3 } from "./layout.ts";
import { WIRE_COLOR_NAME } from "./suporte-wiring.ts";

export interface Net1000 {
  id: string;
  name: string;
  /** "PART:PIN" ends that are one conductor. */
  pins: string[];
}

export const NETS_1000X: Net1000[] = [
  { id: "VIN", name: "Positivo da fonte", pins: ["J1:+", "D2:A"] },
  { id: "APOS_D2", name: "Depois do D2", pins: ["D2:K", "SW1:1"] },
  { id: "CHAVEADO", name: "Positivo depois da chave", pins: ["SW1:2", "DR1:IN+"] },
  { id: "GND", name: "Negativo da fonte", pins: ["J1:-", "DR1:IN-"] },
  { id: "LED+", name: "Saída positiva do driver", pins: ["DR1:LED+", "D1:+"] },
  { id: "LED-", name: "Saída negativa do driver", pins: ["DR1:LED-", "D1:-"] },
];

export interface Wire1000Spec {
  id: string;
  from: string;
  to: string;
  color: string;
  /** Net it belongs to. */
  net: string;
  /** True when one end is on a part of the box wall, so the lid can be pulled away with the wire still connected. */
  panel: boolean;
}

export const WIRES_1000X: Wire1000Spec[] = [
  { id: "F1", from: "D2:K", to: "SW1:1", color: "#d92d20", net: "APOS_D2", panel: true },
  { id: "F2", from: "SW1:2", to: "DR1:IN+", color: "#ff8a1f", net: "CHAVEADO", panel: true },
  { id: "F3", from: "J1:-", to: "DR1:IN-", color: "#222222", net: "GND", panel: true },
  { id: "F4", from: "DR1:LED+", to: "D1:+", color: "#e0c200", net: "LED+", panel: false },
  { id: "F5", from: "DR1:LED-", to: "D1:-", color: "#2f6fdb", net: "LED-", panel: false },
];

export interface Terminal1000 {
  at: Vec3;
  /** Direction the wire leaves the part. */
  exit: Vec3;
  free: number;
}

export interface Cylinder {
  id: string;
  x: number;
  y: number;
  r: number;
  z0: number;
  z1: number;
}

export interface Box {
  id: string;
  min: Vec3;
  max: Vec3;
}

export interface RoutedWire1000 {
  spec: Wire1000Spec;
  from: Vec3;
  to: Vec3;
  /** Control points of the smooth curve, start to end. */
  path: Vec3[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Size of the driver module (matches the 3D model) and where its four solder pads are. */
export const DR1_SIZE: Vec3 = [30, 20, 10];

let frameCache: ReturnType<typeof makeFrame> | null = null;
/** The layout is computed once: the router asks for it millions of times. */
export function frame1000() {
  return (frameCache ??= makeFrame());
}

function makeFrame() {
  const layout = layoutEconomica1000x();
  const p = layout.params;
  const t = layout.lightTube!;
  const bd = layout.board;
  const cx = (bd.xMin + bd.xMax) / 2;
  const cy = (bd.yMin + bd.yMax) / 2;
  const boardTop = bd.standoffHeight + 1.6;
  const wallIn = layout.box.yMin + p.wall;
  const xIn = layout.box.xMax - p.wall;
  const starTop = t.heatsinkTop + p.ledStarThickness;
  return { layout, p, t, cx, cy, boardTop, wallIn, xIn, starTop };
}

/** D2 stands in the air behind the jack, along y, with its anode on the + lug of the jack. */
export function d2Placement() {
  const { p, xIn } = frame1000();
  const lug: Vec3 = [xIn - 19, p.jackY + 3.2, 17];
  const length = 13;
  return { anode: lug, cathode: [lug[0], lug[1] + length, lug[2]] as Vec3, center: [lug[0], lug[1] + length / 2, lug[2]] as Vec3, bodyLength: 5.2 };
}

export function terminals1000x(): Record<string, Terminal1000> {
  const { p, cx, cy, boardTop, wallIn, xIn, starTop } = frame1000();
  const swX = p.switchCutout.x;
  const padZ = boardTop + 1.25;
  const d2 = d2Placement();
  return {
    "SW1:1": { at: [swX - 3.5, wallIn + 19, 17], exit: [0, 1, 0], free: 3 },
    "SW1:2": { at: [swX + 3.5, wallIn + 19, 17], exit: [0, 1, 0], free: 3 },
    "J1:+": { at: d2.anode, exit: [-1, 0, 0], free: 3 },
    "J1:-": { at: [xIn - 19, p.jackY - 3.2, 17], exit: [-1, 0, 0], free: 3 },
    "D2:A": { at: d2.anode, exit: [0, 1, 0], free: 3 },
    "D2:K": { at: d2.cathode, exit: [0, 1, 0], free: 3 },
    "DR1:IN+": { at: [cx - 13, cy + 8, padZ], exit: [0, 0, 1], free: 3 },
    "DR1:IN-": { at: [cx - 13, cy - 8, padZ], exit: [0, 0, 1], free: 3 },
    "DR1:LED+": { at: [cx + 13, cy + 8, padZ], exit: [0, 0, 1], free: 3 },
    "DR1:LED-": { at: [cx + 13, cy - 8, padZ], exit: [0, 0, 1], free: 3 },
    "D1:+": { at: [-5.8, -3.8, starTop + 0.1], exit: [0, 0, 1], free: 2.5 },
    "D1:-": { at: [5.8, -3.8, starTop + 0.1], exit: [0, 0, 1], free: 2.5 },
  };
}

/** Everything a wire must stay away from: boxes and upright cylinders; the light tube is a shell with a slot at its foot. */
export function obstacles1000x(): { boxes: Box[]; cylinders: Cylinder[] } {
  const { layout, p, t, cx, cy, boardTop, wallIn, xIn, starTop } = frame1000();
  const d2 = d2Placement();
  const bd = layout.board;
  const boxes: Box[] = [
    { id: "SW1", min: [p.switchCutout.x - 10.3, wallIn, 12.7], max: [p.switchCutout.x + 10.3, wallIn + 14, 27.3] },
    { id: "J1", min: [xIn - 14, p.jackY - 5.5, 12], max: [xIn, p.jackY + 5.5, 23] },
    { id: "D2", min: [d2.center[0] - 1.5, d2.center[1] - d2.bodyLength / 2, d2.center[2] - 1.5], max: [d2.center[0] + 1.5, d2.center[1] + d2.bodyLength / 2, d2.center[2] + 1.5] },
    { id: "PCB1", min: [bd.xMin, bd.yMin, bd.standoffHeight], max: [bd.xMax, bd.yMax, boardTop] },
    // the parts of the module (inductor, chips) stand in its middle; its two ends are bare board with the solder pads
    { id: "DR1", min: [cx - 11.8, cy - DR1_SIZE[1] / 2, boardTop], max: [cx + 11.8, cy + DR1_SIZE[1] / 2, boardTop + DR1_SIZE[2]] },
    { id: "DR1 placa", min: [cx - DR1_SIZE[0] / 2, cy - DR1_SIZE[1] / 2, boardTop], max: [cx + DR1_SIZE[0] / 2, cy + DR1_SIZE[1] / 2, boardTop + 1.25] },
    { id: "LED emissor", min: [-3.4, -3.4, starTop], max: [3.4, 3.4, starTop + 3.4] },
  ];
  const cylinders: Cylinder[] = [
    { id: "dissipador", x: 0, y: 0, r: p.heatsinkDiameter / 2, z0: 0, z1: t.heatsinkTop },
    { id: "estrela", x: 0, y: 0, r: p.ledStarDiameter / 2, z0: t.heatsinkTop, z1: starTop },
    ...layout.boardPosts.map((q, i) => ({ id: `poste ${i + 1}`, x: q.x, y: q.y, r: q.outerDiameter / 2, z0: 0, z1: q.top })),
    ...layout.posts.map((q, i) => ({ id: `parafuso ${i + 1}`, x: q.x, y: q.y, r: q.outerDiameter / 2, z0: 0, z1: layout.cavity.top })),
  ];
  return { boxes, cylinders };
}

const CLEAR = 1.1;
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The id of what the point touches, or null. The tube is a shell (inner 22.2 to outer 24.2 mm) that can be crossed only through its slot. */
let obsCache: ReturnType<typeof obstacles1000x> | null = null;
export function blockedAt(pt: Vec3, obs = (obsCache ??= obstacles1000x())): string | null {
  const { t } = frame1000();
  const [x, y, z] = pt;
  if (Math.abs(x) > 41.2 || y < -41.2 || y > 66.2 || z > 34.5 || z < 1.4) return "caixa";
  for (const b of obs.boxes) {
    if (x > b.min[0] - CLEAR && x < b.max[0] + CLEAR && y > b.min[1] - CLEAR && y < b.max[1] + CLEAR && z > b.min[2] - CLEAR && z < b.max[2] + CLEAR) return b.id;
  }
  for (const c of obs.cylinders) {
    if (Math.hypot(x - c.x, y - c.y) < c.r + CLEAR && z > c.z0 - CLEAR && z < c.z1 + CLEAR) return c.id;
  }
  const r = Math.hypot(x, y);
  const inShell = r > t.innerDiameter / 2 - CLEAR && r < t.outerDiameter / 2 + CLEAR && z < t.top + CLEAR;
  if (inShell) {
    const inSlot = y > 0 && Math.abs(x) <= t.slot.halfWidth - 0.8 && z >= 1.4 && z <= t.slot.height - 0.8;
    if (!inSlot) return "tubo de luz";
  }
  return null;
}

class Heap {
  private a: { f: number; i: number }[] = [];
  push(n: { f: number; i: number }) {
    const a = this.a;
    a.push(n);
    let k = a.length - 1;
    while (k > 0) {
      const up = (k - 1) >> 1;
      if (a[up]!.f <= a[k]!.f) break;
      [a[up], a[k]] = [a[k]!, a[up]!];
      k = up;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < a.length && a[l]!.f < a[m]!.f) m = l;
        if (r < a.length && a[r]!.f < a[m]!.f) m = r;
        if (m === k) break;
        [a[m], a[k]] = [a[k]!, a[m]!];
        k = m;
      }
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}

const STEP = 1.5;
const X0 = -42;
const Y0 = -42;
const Z0 = 1.4;
const NX = Math.ceil(84 / STEP) + 1;
const NY = Math.ceil(109 / STEP) + 1;
const NZ = Math.ceil(33.1 / STEP) + 1;
const idx = (i: number, j: number, k: number) => (k * NY + j) * NX + i;
const at = (i: number, j: number, k: number): Vec3 => [X0 + i * STEP, Y0 + j * STEP, Z0 + k * STEP];

/** Radius around each terminal where the wire is allowed to touch the part it is soldered to. */
const FREE_START = 4;
const FREE_END = 3.6;

function sampleClear(a: Vec3, b: Vec3, obs: ReturnType<typeof obstacles1000x>, start: Vec3, end: Vec3): boolean {
  const steps = Math.max(2, Math.ceil(dist(a, b) / 0.4));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const pt: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    if (dist(pt, start) < FREE_START || dist(pt, end) < FREE_END) continue;
    if (blockedAt(pt, obs)) return false;
  }
  return true;
}

const EXIT_STUB = 3.5;

/** One wire: A* over a 1.5 mm grid between the stubs of its two ends, then straightened wherever the straight line is free. */
function route(spec: Wire1000Spec, terms: Record<string, Terminal1000>, obs: ReturnType<typeof obstacles1000x>): RoutedWire1000 {
  const a = terms[spec.from]!;
  const b = terms[spec.to]!;
  const stub = (t: Terminal1000): Vec3 => [t.at[0] + t.exit[0] * EXIT_STUB, t.at[1] + t.exit[1] * EXIT_STUB, t.at[2] + t.exit[2] * EXIT_STUB];
  const s0 = stub(a);
  const s1 = stub(b);
  const cell = (p: Vec3): [number, number, number] => [Math.round((p[0] - X0) / STEP), Math.round((p[1] - Y0) / STEP), Math.round((p[2] - Z0) / STEP)];
  const [si, sj, sk] = cell(s0);
  const [ei, ej, ek] = cell(s1);
  const total = NX * NY * NZ;
  const g = new Float64Array(total).fill(Infinity);
  const from = new Int32Array(total).fill(-1);
  const heap = new Heap();
  const h = (i: number, j: number, k: number) => Math.hypot((i - ei) * STEP, (j - ej) * STEP, (k - ek) * STEP);
  const start = idx(si, sj, sk);
  g[start] = 0;
  heap.push({ f: h(si, sj, sk), i: start });
  let found = -1;
  while (heap.size) {
    const cur = heap.pop()!;
    const k = Math.floor(cur.i / (NX * NY));
    const j = Math.floor((cur.i - k * NX * NY) / NX);
    const i = cur.i - k * NX * NY - j * NX;
    if (i === ei && j === ej && k === ek) {
      found = cur.i;
      break;
    }
    if (cur.f - h(i, j, k) > g[cur.i]! + 1e-6) continue;
    for (let dk = -1; dk <= 1; dk++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj && !dk) continue;
          const ni = i + di;
          const nj = j + dj;
          const nk = k + dk;
          if (ni < 0 || nj < 0 || nk < 0 || ni >= NX || nj >= NY || nk >= NZ) continue;
          const p = at(ni, nj, nk);
          if (dist(p, a.at) >= FREE_START && dist(p, b.at) >= FREE_END && blockedAt(p, obs)) continue;
          // a diagonal step can cut the corner of an obstacle between two free cells: the whole step is sampled
          if (!sampleClear(at(i, j, k), p, obs, a.at, b.at)) continue;
          const step = Math.hypot(di, dj, dk) * STEP;
          // small penalty for bending and for climbing, so the wires stay low and tidy
          const cost = g[cur.i]! + step + 0.15 * Math.abs(dk) * STEP;
          const n = idx(ni, nj, nk);
          if (cost < g[n]!) {
            g[n] = cost;
            from[n] = cur.i;
            heap.push({ f: cost + h(ni, nj, nk), i: n });
          }
        }
      }
    }
  }
  if (found < 0) {
    throw new Error(`no free route for ${spec.id}`);
  }
  const cells: Vec3[] = [];
  for (let n = found; n >= 0; n = from[n]!) {
    const k = Math.floor(n / (NX * NY));
    const j = Math.floor((n - k * NX * NY) / NX);
    cells.push(at(n - k * NX * NY - j * NX, j, k));
  }
  cells.reverse();
  cells[0] = s0;
  cells[cells.length - 1] = s1;
  // straighten: from each point jump to the farthest later point that the straight line reaches
  const out: Vec3[] = [cells[0]!];
  let i = 0;
  while (i < cells.length - 1) {
    let j = cells.length - 1;
    while (j > i + 1 && !sampleClear(cells[i]!, cells[j]!, obs, a.at, b.at)) j--;
    out.push(cells[j]!);
    i = j;
  }
  return { spec, from: a.at, to: b.at, path: [a.at, ...out, b.at].map((p) => p.map(round) as Vec3) };
}

/** Routes the wires from scratch (about 5 s): `scripts/gerar-fios-1000x.ts` runs it and stores the result in suporte-1000x-fios.ts. */
export function routeWires1000x(): RoutedWire1000[] {
  const terms = terminals1000x();
  const obs = obstacles1000x();
  return WIRES_1000X.map((spec) => route(spec, terms, obs));
}

/** The stored routes (a test checks that they still match the layout); the 3D uses these so the page does not stall. */
export function wires1000x(): RoutedWire1000[] {
  const terms = terminals1000x();
  return WIRES_1000X.map((spec) => ({ spec, from: terms[spec.from]!.at, to: terms[spec.to]!.at, path: FIOS_1000X[spec.id]! }));
}

/** True when the polyline stays clear of every obstacle (the tests use it). */
export function routeIsClear1000x(w: RoutedWire1000): boolean {
  const terms = terminals1000x();
  const obs = obstacles1000x();
  const a = terms[w.spec.from]!;
  const b = terms[w.spec.to]!;
  for (let i = 0; i < w.path.length - 1; i++) if (!sampleClear(w.path[i]!, w.path[i + 1]!, obs, a.at, b.at)) return false;
  return true;
}

const pathLength = (p: Vec3[]) => p.slice(1).reduce((s, q, i) => s + dist(q, p[i]!), 0);

export interface CutRow1000 {
  id: string;
  colorHex: string;
  from: string;
  to: string;
  path: number;
  cut: number;
}

/** What to cut: path + 12 mm of stripped ends + slack (70 mm on the wires to the wall parts, so the lid pulls away, 15 mm on the others), up to 5 mm. */
export function wireCutList1000x(): CutRow1000[] {
  return wires1000x().map((w) => {
    const path = pathLength(w.path);
    return { id: w.spec.id, colorHex: w.spec.color, from: w.spec.from.replace(":", " "), to: w.spec.to.replace(":", " "), path: Math.round(path), cut: Math.ceil((path + 12 + (w.spec.panel ? 70 : 15)) / 5) * 5 };
  });
}

export { WIRE_COLOR_NAME };
