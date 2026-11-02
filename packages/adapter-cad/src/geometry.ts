import { makeBox, makeCylinder, type Shape3D } from "replicad";
import { EMBED, type CutoutLayout, type EnclosureLayout, type Vec3 } from "./layout.ts";
import type { MeshData } from "./protocol.ts";

/**
 * Replicad (OpenCascade) solids for an enclosure layout. Callers must have loaded
 * the kernel with replicad's setOC() first (see worker-host.ts and the tests).
 */

/** Chordal deviation 0.02 mm, at most ~5.7° per segment: finer than an FDM nozzle can print. */
export const TESSELLATION = { tolerance: 0.02, angularTolerance: 0.1 };

const AXIS: Record<CutoutLayout["axis"], Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

function centeredBox(center: Vec3, size: Vec3): Shape3D {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size;
  return makeBox([cx - sx / 2, cy - sy / 2, cz - sz / 2], [cx + sx / 2, cy + sy / 2, cz + sz / 2]);
}

function cuttingTool(cutout: CutoutLayout): Shape3D {
  if (cutout.shape === "rect") return centeredBox(cutout.center, cutout.size);
  const i = cutout.axis === "x" ? 0 : cutout.axis === "y" ? 1 : 2;
  const direction = AXIS[cutout.axis];
  const length = cutout.size[i];
  const diameter = cutout.size[(i + 1) % 3]!;
  const start = cutout.center.map((c, k) => c - (direction[k]! * length) / 2) as Vec3;
  return makeCylinder(diameter / 2, length, start, direction);
}

/** Open box with standoffs and the wall cutouts; sits on z = 0. */
export function buildBase(layout: EnclosureLayout): Shape3D {
  const { outer, inner, baseHeight, floorTop } = layout;
  let base: Shape3D = makeBox([-outer.width / 2, -outer.depth / 2, 0], [outer.width / 2, outer.depth / 2, baseHeight]).cut(
    makeBox([-inner.width / 2, -inner.depth / 2, floorTop], [inner.width / 2, inner.depth / 2, baseHeight + 1]),
  );
  for (const s of layout.standoffs) {
    base = base.fuse(makeCylinder(s.outerDiameter / 2, s.top - s.bottom + EMBED, [s.x, s.y, s.bottom - EMBED]));
  }
  for (const s of layout.standoffs) {
    base = base.cut(makeCylinder(s.pilotDiameter / 2, s.top - s.bottom + 1, [s.x, s.y, s.bottom]));
  }
  for (const cutout of layout.cutouts) {
    if (cutout.part === "base") base = base.cut(cuttingTool(cutout));
  }
  return base;
}

/** Lid plate plus locating lip, in its assembled position on top of the walls. */
export function buildLid(layout: EnclosureLayout): Shape3D {
  const { outer, lid } = layout;
  let shape: Shape3D = makeBox([-outer.width / 2, -outer.depth / 2, lid.bottom], [outer.width / 2, outer.depth / 2, lid.top]);
  if (lid.lip) {
    const { outerWidth, outerDepth, innerWidth, innerDepth, bottom } = lid.lip;
    const ring = makeBox([-outerWidth / 2, -outerDepth / 2, bottom], [outerWidth / 2, outerDepth / 2, lid.bottom + EMBED]).cut(
      makeBox([-innerWidth / 2, -innerDepth / 2, bottom - 1], [innerWidth / 2, innerDepth / 2, lid.bottom + EMBED + 1]),
    );
    shape = shape.fuse(ring);
  }
  for (const cutout of layout.cutouts) {
    if (cutout.part === "lid") shape = shape.cut(cuttingTool(cutout));
  }
  return shape;
}

/** The lid turned outer face down and resting on z = 0, as it should be printed. */
export function lidForPrinting(lid: Shape3D, layout: EnclosureLayout): Shape3D {
  return lid.clone().rotate(180, [0, 0, 0], [1, 0, 0]).translate(0, 0, layout.lid.top);
}

export function meshOf(shape: Shape3D): MeshData {
  const mesh = shape.mesh(TESSELLATION);
  return {
    positions: new Float32Array(mesh.vertices),
    normals: new Float32Array(mesh.normals),
    indices: new Uint32Array(mesh.triangles),
  };
}

export async function stlOf(shape: Shape3D): Promise<ArrayBuffer> {
  return shape.blobSTL({ binary: true, ...TESSELLATION }).arrayBuffer();
}

export interface EnclosureShapes {
  base: Shape3D;
  /** Assembled position. */
  lid: Shape3D;
  /** Print orientation. */
  lidPrint: Shape3D;
}

export function buildEnclosure(layout: EnclosureLayout): EnclosureShapes {
  const base = buildBase(layout);
  const lid = buildLid(layout);
  return { base, lid, lidPrint: lidForPrinting(lid, layout) };
}
