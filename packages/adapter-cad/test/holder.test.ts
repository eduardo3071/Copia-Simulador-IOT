import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import opencascade from "replicad-opencascadejs";
import { makeCylinder, setOC, type Shape3D } from "replicad";
import { buildHolder, buildTubeProxy, holderOnBack } from "../src/holder-geometry.ts";
import { stlOf } from "../src/geometry.ts";
import { DEFAULT_HOLDER_PARAMS, holderLayout, readBinaryStl, stlBounds, stlVolume } from "../src/index.ts";

const require = createRequire(import.meta.url);

beforeAll(async () => {
  setOC(await opencascade({ wasmBinary: readFileSync(require.resolve("replicad-opencascadejs/wasm")) }));
});

const stl = async (shape: Shape3D) => readBinaryStl(await stlOf(shape));

describe("holder (suporte do pregoscopio)", () => {
  const layout = holderLayout();
  const p = DEFAULT_HOLDER_PARAMS;

  it("has no layout errors with the default parameters", () => {
    expect(layout.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("body bounding box matches the parameters", async () => {
    const { body } = buildHolder(layout);
    const { min, max } = stlBounds(await stl(body));
    const tol = 0.05;
    expect(min[0]).toBeCloseTo(-p.boxWidth / 2, 1);
    expect(max[0]).toBeCloseTo(p.boxWidth / 2, 1);
    expect(min[1]).toBeCloseTo(-p.boxDepthFront, 1);
    expect(max[1]).toBeCloseTo(p.boxDepthBack, 1);
    expect(min[2]).toBeCloseTo(0, 1);
    // Sample plane + working distance + objective (35) + inner tube (9 + 10 pulled) + outer tube (115).
    const top = p.boxHeight + p.slideThickness - p.channelDepth + p.workingDistance + p.objectiveLength + p.sleeveLength + p.innerPull + p.tubeLength;
    expect(Math.abs(max[2] - top)).toBeLessThan(tol);
    expect(layout.totalHeight).toBeCloseTo(top, 6);
  });

  it("the pregoscopio (tube, sleeve and objective) does not touch the body, the clamp or the lid", async () => {
    const shapes = buildHolder(layout);
    const tube = buildTubeProxy(layout);
    for (const [name, part] of Object.entries(shapes)) {
      const overlap = tube.clone().intersect(part.clone());
      const mesh = overlap.mesh({ tolerance: 0.02, angularTolerance: 0.1 });
      expect(mesh.triangles.length, `tube x ${name}`).toBe(0);
    }
  });

  it("the objective's front lens sits one working distance above the slide and the slide channel is cut in the box top", async () => {
    expect(layout.tube.noseZ).toBeCloseTo(layout.samplePlane + p.workingDistance, 6);
    expect(layout.samplePlane).toBeCloseTo(p.boxHeight + p.slideThickness - p.channelDepth, 6);
    const channel = layout.cutouts.find((c) => c.id === "slide-channel")!;
    expect(channel.size[1]).toBeCloseTo(p.slideWidth + p.slideFit, 6);
    const withChannel = stlVolume(await stl(buildHolder(layout).body));
    const flat = stlVolume(await stl(buildHolder(holderLayout({ ...p, channelDepth: 0.01 })).body));
    // The channel removes ~ width x boxWidth x depth (the LED window sits inside it).
    expect(flat - withChannel).toBeGreaterThan((p.slideWidth + p.slideFit) * p.boxWidth * p.channelDepth * 0.6);
  });

  it("the clamp leaves exactly clampGap between the halves", async () => {
    const { body, clamp } = buildHolder(layout);
    const bodyRing = stlBounds(await stl(body));
    const capBounds = stlBounds(await stl(clamp));
    expect(bodyRing.min[0]).toBeLessThan(0);
    expect(capBounds.max[1]).toBeCloseTo(-p.clampGap + 0.5, 1); // ears embed 0.5 mm into the gap
    expect(capBounds.min[1]).toBeLessThan(-layout.ring.outerRadius + 0.01);
  });

  it("in print orientation the body and the clamp rest flat and fit a 300 mm bed", async () => {
    const { body, clamp } = buildHolder(layout);
    const flat = stlBounds(await stl(holderOnBack(body)));
    expect(flat.min[2]).toBeCloseTo(0, 3);
    expect(flat.size[0]).toBeCloseTo(p.boxWidth, 1);
    expect(flat.size[1]).toBeCloseTo(layout.totalHeight, 1);
    expect(flat.size[2]).toBeCloseTo(p.boxDepthFront + p.boxDepthBack, 1);
    expect(Math.max(flat.size[0], flat.size[1])).toBeLessThan(300);
    const cap = stlBounds(await stl(holderOnBack(clamp)));
    expect(cap.min[2]).toBeCloseTo(0, 3);
    expect(Math.max(...cap.size)).toBeLessThan(300);
  });

  it("the lid carries the battery cradle and the LED post, and fits the body", async () => {
    const { body, lid, diffuser } = buildHolder(layout);
    const tri = await stl(lid);
    const { size } = stlBounds(tri);
    expect(size[0]).toBeCloseTo(p.boxWidth, 1);
    expect(size[2]).toBeCloseTo(p.wall + layout.ledPost.top, 2); // the LED post is the tallest thing on the lid
    // Lid + cradle + post never touch the body, and the 9 V battery fits its pocket with `batteryFit`.
    for (const [name, part] of Object.entries({ lid, diffuser })) {
      const overlap = body.clone().intersect(part.clone());
      expect(overlap.mesh({ tolerance: 0.02, angularTolerance: 0.1 }).triangles.length, `body x ${name}`).toBe(0);
    }
    const cradle = layout.cradle!;
    const pocketX = cradle.xMax - cradle.xMin - 2 * p.cradleWall;
    expect(pocketX).toBeCloseTo(p.batteryLength + p.batteryFit, 6);
    expect(cradle.height).toBeLessThan(layout.cavity.top);
  });

  it("the LED tip stays below the diffuser and the diffuser disc fits its seat", async () => {
    expect(layout.ledPost.ledTop).toBeCloseTo(layout.cavity.top - p.ledToCeiling, 6);
    expect(layout.ledPost.seatDiameter).toBeGreaterThan(p.ledFlange);
    expect(layout.diffuserSeat.diameter).toBeGreaterThan(layout.diffuserSeat.discDiameter);
    expect(layout.diffuserSeat.discDiameter).toBeGreaterThan(p.ledWindowDiameter);
    const disc = stlBounds(await stl(buildHolder(layout).diffuser));
    expect(disc.size[0]).toBeCloseTo(p.diffuserDiameter, 1);
    expect(disc.size[2]).toBeCloseTo(p.diffuserThickness, 3);
    const bodyAbove = layout.box.height - p.channelDepth - layout.diffuserSeat.top;
    expect(bodyAbove).toBeGreaterThanOrEqual(0.4);
  });

  it("the 'fonte' variant swaps the battery for the dimmer board, a DC jack and a knob", async () => {
    const v2 = holderLayout({ ...p, variant: "fonte" });
    expect(v2.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(v2.cradle).toBeNull();
    expect(v2.cutouts.map((c) => c.id).sort()).toEqual(["jack", "knob", "slide-channel", "switch", "window"]);
    expect(layout.cutouts.map((c) => c.id).sort()).toEqual(["slide-channel", "switch", "window"]);
    // four standoffs on the 63 x 18 mm hole pattern of the 70 x 25 mm board
    expect(v2.boardPosts).toHaveLength(4);
    const xs = v2.boardPosts.map((q) => q.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(p.driverBoards.fonte.width - 2 * p.driverBoards.fonte.holeInset, 6);
    const { body, lid } = buildHolder(v2);
    const overlap = body.clone().intersect(lid.clone());
    expect(overlap.mesh({ tolerance: 0.02, angularTolerance: 0.1 }).triangles.length).toBe(0);
    const tri = await stl(lid);
    expect(stlBounds(tri).size[2]).toBeCloseTo(p.wall + v2.ledPost.top, 2);
  });

  it("rounded corners and the column window remove material without changing the outer size", async () => {
    const volume = async (params: Partial<typeof p>) => {
      const { body } = buildHolder(holderLayout({ ...p, ...params }));
      return stlVolume(await stl(body));
    };
    const finished = await volume({});
    const sharp = await volume({ cornerRadius: 0, edgeRound: 0 });
    const solid = await volume({ lighten: false });
    // four vertical corners of the 40 mm box: 4 x (1 - pi/4) x r^2 x h, minus the thin-wall parts that are not solid anyway
    expect(sharp - finished).toBeGreaterThan(800);
    // the stadium window: (width x (length - width) + pi r^2) x column depth
    const win = layout.columnWindow!;
    const windowVolume = (win.width * (win.zMax - win.zMin - win.width) + Math.PI * (win.width / 2) ** 2) * p.columnDepth;
    expect(solid - finished).toBeGreaterThan(windowVolume * 0.95);
    expect(solid - finished).toBeLessThan(windowVolume * 1.2);
    const { min, max } = stlBounds(await stl(buildHolder(layout).body));
    expect(min[0]).toBeCloseTo(-p.boxWidth / 2, 1);
    expect(max[1]).toBeCloseTo(p.boxDepthBack, 1);
    expect(layout.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("the column window leaves side walls of at least 5 mm and never reaches the box or the arm", () => {
    const win = layout.columnWindow!;
    expect((p.columnWidth - win.width) / 2).toBeGreaterThanOrEqual(5);
    expect(win.zMin).toBeGreaterThanOrEqual(layout.box.height + 20);
    expect(win.zMax).toBeLessThanOrEqual(layout.ring.bottom - 20);
    expect(holderLayout({ ...p, windowWidth: 40 }).issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("the 'pilha' variant carries the 40 x 25 mm driver board in front of the LED, clear of the post, the cradle and the switch", () => {
    expect(layout.boardPosts).toHaveLength(4);
    const xs = layout.boardPosts.map((q) => q.x);
    const ys = layout.boardPosts.map((q) => q.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(p.driverBoards.pilha.width - 2 * p.driverBoards.pilha.holeInset, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(p.driverBoards.pilha.depth - 2 * p.driverBoards.pilha.holeInset, 6);
    expect(layout.board.yMax).toBeLessThan(layout.ledPost.y - layout.ledPost.diameter / 2);
    expect(layout.board.yMax).toBeLessThan(layout.cradle!.yMin);
    expect(layout.issues).toEqual([]);
    // a board pushed onto the LED post is reported
    const crowded = holderLayout({ ...p, driverBoards: { ...p.driverBoards, pilha: { ...p.driverBoards.pilha, x: 0, y: 0 } } });
    expect(crowded.issues.some((i) => i.message.includes("porta-LED"))).toBe(true);
  });

  it("the LED legs leave sideways at the foot of the post, toward the driver board, and the lid stays closed underneath", () => {
    expect(layout.ledPost.slot.dir).toBe(-1); // v1: the board is in front of the LED
    expect(holderLayout({ ...p, variant: "fonte" }).ledPost.slot.dir).toBe(1); // v2: behind it
    const { lid } = buildHolder(layout);
    const solidUnder = lid.clone().intersect(makeCylinder(1, 2, [0, 0, -2.3]));
    expect(solidUnder.mesh({ tolerance: 0.02, angularTolerance: 0.1 }).triangles.length).toBeGreaterThan(0);
    // and the slot is open: a probe at its mouth (in front of the post, just above the lid) hits nothing
    const reach = layout.ledPost.diameter / 2;
    const mouth = lid.clone().intersect(makeCylinder(0.8, 3, [0, -reach, 1.5]));
    expect(mouth.mesh({ tolerance: 0.02, angularTolerance: 0.1 }).triangles.length).toBe(0);
  });
});
