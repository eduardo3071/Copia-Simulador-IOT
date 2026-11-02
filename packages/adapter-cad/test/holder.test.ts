import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import opencascade from "replicad-opencascadejs";
import { setOC, type Shape3D } from "replicad";
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

  it("the lid is a plate with four holes", async () => {
    const { lid } = buildHolder(layout);
    const tri = await stl(lid);
    const { size } = stlBounds(tri);
    expect(size[0]).toBeCloseTo(p.boxWidth, 1);
    expect(size[2]).toBeCloseTo(p.wall, 2);
    const full = p.boxWidth * (p.boxDepthFront + p.boxDepthBack) * p.wall;
    const holes = 4 * Math.PI * (p.screwHole / 2) ** 2 * p.wall;
    expect(stlVolume(tri)).toBeGreaterThan(full - holes - 1);
    expect(stlVolume(tri)).toBeLessThan(full - holes * 0.98);
  });
});
