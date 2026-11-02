import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import opencascade from "replicad-opencascadejs";
import { setOC } from "replicad";
import {
  applyCommand,
  cornerMountingHoles,
  createProject,
  type Cutout,
  type EnclosureParams,
  type Project,
} from "@simiot/project-model";
import { buildEnclosure, stlOf } from "../src/geometry.ts";
import {
  enclosureLayout,
  PCB_THICKNESS,
  readBinaryStl,
  stlBounds,
  stlVolume,
  withStlHeader,
  type FromCadWorker,
  type ToCadWorker,
} from "../src/index.ts";
import { startCadWorker } from "../src/worker-host.ts";

const require = createRequire(import.meta.url);
const loadKernel = () => opencascade({ wasmBinary: readFileSync(require.resolve("replicad-opencascadejs/wasm")) });

beforeAll(async () => {
  setOC(await loadKernel());
});

const BOARD = { width: 60, height: 40 };
/** Four corner holes plus an off-centre, smaller one, so a mirrored or shifted standoff cannot pass. */
const HOLES = [...cornerMountingHoles(BOARD), { id: "MH5", x: 7.25, y: -4.5, diameter: 2.5 }];

function project(params: Partial<EnclosureParams> = {}, cutouts: Cutout[] = []): Project {
  let p = createProject("Gabinete");
  p = applyCommand(p, { type: "setBoardSize", ...BOARD });
  p = applyCommand(p, { type: "setMountingHoles", holes: HOLES });
  p = applyCommand(p, { type: "createEnclosure", params });
  for (const cutout of cutouts) p = applyCommand(p, { type: "addCutout", cutout });
  return p;
}

async function build(p: Project) {
  const layout = enclosureLayout(p.pcb, p.enclosure!);
  const shapes = buildEnclosure(layout);
  return {
    layout,
    base: readBinaryStl(await stlOf(shapes.base)),
    lid: readBinaryStl(await stlOf(shapes.lidPrint)),
  };
}

/** Expected dimensions, computed here from the parameters (not from the layout under test). */
function expected(p: EnclosureParams) {
  const innerW = BOARD.width + 2 * p.clearance;
  const innerD = BOARD.height + 2 * p.clearance;
  const outerW = innerW + 2 * p.wall;
  const outerD = innerD + 2 * p.wall;
  const baseH = p.wall + p.standoffHeight + PCB_THICKNESS + p.headroom;
  const lipW = innerW - 2 * p.fit;
  const lipD = innerD - 2 * p.fit;
  return { innerW, innerD, outerW, outerD, baseH, lipW, lipD, lidH: p.wall + p.lipHeight };
}

type Pt = [number, number];

/** Distinct (x, y) of STL vertices lying on the plane z. */
function verticesAtZ(tris: Float32Array, z: number): Pt[] {
  const seen = new Map<string, Pt>();
  for (let i = 0; i < tris.length; i += 3) {
    if (Math.abs(tris[i + 2]! - z) > 1e-3) continue;
    const pt: Pt = [tris[i]!, tris[i + 1]!];
    seen.set(`${pt[0].toFixed(4)},${pt[1].toFixed(4)}`, pt);
  }
  return [...seen.values()];
}

/** Single-linkage clusters: points closer than `reach` end up together. */
function clusters(points: Pt[], reach: number): Pt[][] {
  const groups: Pt[][] = [];
  for (const pt of points) {
    const near = groups.filter((g) => g.some((q) => Math.hypot(q[0] - pt[0], q[1] - pt[1]) < reach));
    const merged = [pt, ...near.flat()];
    for (const g of near) groups.splice(groups.indexOf(g), 1);
    groups.push(merged);
  }
  return groups;
}

/** Exact circle through three well-spread points of a tessellated circle. */
function fitCircle(points: Pt[]): { x: number; y: number; r: number } {
  const a = points[0]!;
  const dist = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const b = points.reduce((best, p) => (dist(p, a) > dist(best, a) ? p : best));
  const area = (p: Pt) => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
  const c = points.reduce((best, p) => (area(p) > area(best) ? p : best));
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const sq = (p: Pt) => p[0] ** 2 + p[1] ** 2;
  const x = (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d;
  const y = (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d;
  return { x, y, r: Math.hypot(a[0] - x, a[1] - y) };
}

const PARAM_SETS: Array<[string, Partial<EnclosureParams>]> = [
  ["defaults", {}],
  ["custom", { wall: 3, clearance: 1.5, standoffHeight: 8, headroom: 12, lipHeight: 3, fit: 0.3 }],
];

describe.each(PARAM_SETS)("enclosure STL (%s parameters)", (_name, overrides) => {
  const p = project(overrides);
  const params = p.enclosure!.params;
  const e = expected(params);
  let base: Float32Array;
  let lid: Float32Array;

  beforeAll(async () => {
    ({ base, lid } = await build(p));
  });

  it("base outer dimensions match wall, clearance, standoff height and headroom", () => {
    const { min, max } = stlBounds(base);
    expect(min[0]).toBeCloseTo(-e.outerW / 2, 3);
    expect(max[0]).toBeCloseTo(e.outerW / 2, 3);
    expect(min[1]).toBeCloseTo(-e.outerD / 2, 3);
    expect(max[1]).toBeCloseTo(e.outerD / 2, 3);
    expect(min[2]).toBeCloseTo(0, 3);
    expect(max[2]).toBeCloseTo(e.baseH, 3);
  });

  it("base volume is the shell plus the standoffs minus the pilot holes", () => {
    const shell = e.outerW * e.outerD * e.baseH - e.innerW * e.innerD * (e.baseH - params.wall);
    const cylinders = HOLES.map((h) => {
      const ro = (h.diameter + 2 * params.wall) / 2;
      const rp = Math.round(h.diameter * 8) / 10 / 2;
      return Math.PI * (ro ** 2 - rp ** 2) * params.standoffHeight;
    });
    const standoffs = cylinders.reduce((a, b) => a + b, 0);
    // tessellated circles are inscribed polygons: allow 0.5 % of the round parts
    expect(Math.abs(stlVolume(base) - (shell + standoffs))).toBeLessThan(standoffs * 0.005 + 0.5);
  });

  it("standoffs are centred on the PCB mounting holes, with the right diameters", () => {
    const topOfStandoffs = params.wall + params.standoffHeight;
    // reach spans the gap between pilot and outer ring, far less than the distance between standoffs
    const groups = clusters(verticesAtZ(base, topOfStandoffs), 5);
    expect(groups).toHaveLength(HOLES.length);
    const unmatched = new Set(HOLES);
    for (const group of groups) {
      // the top of a standoff is an annulus: split its vertices into the outer and the pilot ring
      const xs = group.map((pt) => pt[0]);
      const ys = group.map((pt) => pt[1]);
      const rough: Pt = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
      const dist = (pt: Pt) => Math.hypot(pt[0] - rough[0], pt[1] - rough[1]);
      const middle = (Math.min(...group.map(dist)) + Math.max(...group.map(dist))) / 2;
      const outer = fitCircle(group.filter((pt) => dist(pt) > middle));
      const inner = fitCircle(group.filter((pt) => dist(pt) < middle));
      const hole = [...unmatched].find((h) => Math.hypot(h.x - outer.x, h.y - outer.y) < 1e-3);
      expect(hole, `standoff at (${outer.x.toFixed(4)}, ${outer.y.toFixed(4)}) matches no hole`).toBeDefined();
      unmatched.delete(hole!);
      expect(outer.r).toBeCloseTo((hole!.diameter + 2 * params.wall) / 2, 3);
      // pilot hole: concentric with the PCB hole
      expect(Math.hypot(inner.x - hole!.x, inner.y - hole!.y)).toBeLessThan(1e-3);
      expect(inner.r).toBeCloseTo(Math.round(hole!.diameter * 8) / 10 / 2, 3);
    }
    expect(unmatched.size).toBe(0);
  });

  it("lid is printed face down, with the lip sized by the fit clearance", () => {
    const { min, max } = stlBounds(lid);
    expect(max[0] - min[0]).toBeCloseTo(e.outerW, 3);
    expect(max[1] - min[1]).toBeCloseTo(e.outerD, 3);
    expect(min[2]).toBeCloseTo(0, 3);
    expect(max[2]).toBeCloseTo(e.lidH, 3);
    const lipEnd = verticesAtZ(lid, e.lidH);
    const xs = lipEnd.map((pt) => pt[0]);
    const ys = lipEnd.map((pt) => pt[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(e.lipW, 3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(e.lipD, 3);
    const lipWall = params.wall;
    const ring = e.lipW * e.lipD - (e.lipW - 2 * lipWall) * (e.lipD - 2 * lipWall);
    expect(stlVolume(lid)).toBeCloseTo(e.outerW * e.outerD * params.wall + ring * params.lipHeight, 0);
  });
});

describe("manual cutouts", () => {
  const usb: Cutout = { id: "cut_usb", label: "USB", face: "front", shape: "rect", x: -10, y: 0, z: 4, width: 12, height: 10 };
  const jack: Cutout = { id: "cut_jack", label: "Jack", face: "right", shape: "circle", x: 0, y: 5, z: 6, width: 8, height: 8 };
  const display: Cutout = { id: "cut_lcd", label: "Visor", face: "lid", shape: "rect", x: 10, y: 0, z: 0, width: 20, height: 8 };

  it("removes exactly the requested material, where requested", async () => {
    const plain = await build(project());
    const cut = await build(project({}, [usb, jack, display]));
    const wall = 2;
    const e = expected(project().enclosure!.params);
    const removedBase = stlVolume(plain.base) - stlVolume(cut.base);
    const wallHoles = usb.width * usb.height * wall + Math.PI * (jack.width / 2) ** 2 * wall;
    expect(Math.abs(removedBase - wallHoles)).toBeLessThan(wallHoles * 0.005);
    expect(stlVolume(plain.lid) - stlVolume(cut.lid)).toBeCloseTo(display.width * display.height * wall, 1);

    // USB opening corners sit on the outer front face at the requested place (z from the PCB top)
    const pcbTop = wall + 5 + PCB_THICKNESS;
    const front = new Set<string>();
    for (let i = 0; i < cut.base.length; i += 3) {
      if (Math.abs(cut.base[i + 1]! + e.outerD / 2) < 1e-3) front.add(`${cut.base[i]!.toFixed(2)},${cut.base[i + 2]!.toFixed(2)}`);
    }
    for (const dx of [-1, 1]) {
      for (const dz of [-1, 1]) {
        const corner = `${(usb.x + (dx * usb.width) / 2).toFixed(2)},${(pcbTop + usb.z + (dz * usb.height) / 2).toFixed(2)}`;
        expect(front.has(corner), corner).toBe(true);
      }
    }
  });
});

describe("enclosure layout checks", () => {
  it("skips standoffs for holes outside the board and reports it", () => {
    let p = project();
    p = applyCommand(p, { type: "setMountingHoles", holes: [...HOLES, { id: "MH9", x: 40, y: 0, diameter: 3.2 }] });
    const layout = enclosureLayout(p.pcb, p.enclosure!);
    expect(layout.standoffs.map((s) => s.holeId)).toEqual(HOLES.map((h) => h.id));
    expect(layout.issues.some((i) => i.severity === "error" && i.message.includes("MH9"))).toBe(true);
  });

  it("drops a lip that would reach the PCB", () => {
    const p = project({ headroom: 3, lipHeight: 3 });
    const layout = enclosureLayout(p.pcb, p.enclosure!);
    expect(layout.lid.lip).toBeNull();
    expect(layout.lidPrintHeight).toBeCloseTo(p.enclosure!.params.wall);
    expect(layout.issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("warns about cutouts that run off their wall", () => {
    const off: Cutout = { id: "cut_x", label: "Largo", face: "left", shape: "rect", x: 0, y: 0, z: 0, width: 80, height: 5 };
    const layout = enclosureLayout(project().pcb, project({}, [off]).enclosure!);
    expect(layout.issues.some((i) => i.severity === "warning" && i.message.includes("Largo"))).toBe(true);
  });
});

describe("CAD worker protocol", () => {
  it("answers a build request with meshes and both STL files", async () => {
    const p = project();
    const replies: FromCadWorker[] = [];
    let listener: ((event: MessageEvent<ToCadWorker>) => void) | undefined;
    const done = new Promise<void>((resolve) => {
      startCadWorker(
        {
          postMessage: (message) => {
            replies.push(message);
            resolve();
          },
          addEventListener: (_type, l) => (listener = l),
        },
        loadKernel,
      );
    });
    listener!({ data: { v: 1, type: "build", requestId: 7, pcb: p.pcb, enclosure: p.enclosure! } } as MessageEvent<ToCadWorker>);
    await done;
    const reply = replies[0]!;
    expect(reply.type).toBe("built");
    if (reply.type !== "built") return;
    expect(reply.requestId).toBe(7);
    expect(reply.base.mesh.indices.length).toBeGreaterThan(0);
    expect(stlBounds(readBinaryStl(reply.base.stl)).size[2]).toBeCloseTo(reply.layout.baseHeight, 3);
    expect(stlBounds(readBinaryStl(reply.lid.stl)).size[2]).toBeCloseTo(reply.layout.lidPrintHeight, 3);

    const labelled = withStlHeader(reply.base.stl, "Simulador IoT - Gabinete - base - rev. 12");
    expect(new TextDecoder().decode(new Uint8Array(labelled, 0, 80)).trimEnd()).toBe("Simulador IoT - Gabinete - base - rev. 12");
    expect(readBinaryStl(labelled)).toEqual(readBinaryStl(reply.base.stl));
  });
});
