import { makeBox, makeCylinder, type Shape3D } from "replicad";
import { EMBED, type Vec3 } from "./layout.ts";
import type { HolderCutout, HolderLayout } from "./holder.ts";

/** Replicad solids for a holder layout. Callers must have loaded the kernel with setOC() first. */

const AXIS: Record<HolderCutout["axis"], Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Shape3D {
  return makeBox([x0, y0, z0], [x1, y1, z1]);
}

function cutter(c: HolderCutout): Shape3D {
  const [cx, cy, cz] = c.center;
  const [sx, sy, sz] = c.size;
  if (c.shape === "rect") return box(cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2);
  const i = c.axis === "x" ? 0 : c.axis === "y" ? 1 : 2;
  const dir = AXIS[c.axis];
  const length = c.size[i]!;
  const diameter = c.size[(i + 1) % 3]!;
  const start = c.center.map((v, k) => v - (dir[k]! * length) / 2) as Vec3;
  return makeCylinder(diameter / 2, length, start, dir);
}

/** Light box, column, arm and the fixed half of the clamp, in one piece. Open at the bottom. */
export function buildHolderBody(layout: HolderLayout): Shape3D {
  const { box: b, cavity, column, arm, ring, ears, params: p } = layout;
  let body: Shape3D = box(b.xMin, b.xMax, b.yMin, b.yMax, 0, b.height).cut(
    box(cavity.xMin, cavity.xMax, cavity.yMin, cavity.yMax, -1, cavity.top),
  );
  for (const post of layout.posts) {
    body = body.fuse(makeCylinder(post.outerDiameter / 2, post.top - post.bottom, [post.x, post.y, post.bottom]));
  }
  body = body.fuse(box(column.xMin, column.xMax, column.yMin, column.yMax, column.bottom, column.top));
  body = body.fuse(box(arm.xMin, arm.xMax, arm.yMin, arm.yMax, arm.bottom, arm.top));

  const ringHeight = ring.top - ring.bottom;
  const halfRing = makeCylinder(ring.outerRadius, ringHeight, [0, 0, ring.bottom]).intersect(
    box(-ring.outerRadius, ring.outerRadius, 0, ring.outerRadius, ring.bottom - 1, ring.top + 1),
  );
  body = body.fuse(halfRing);
  for (const ear of ears) {
    body = body.fuse(box(ear.x - ear.width / 2, ear.x + ear.width / 2, 0, ear.length, ring.bottom, ring.top));
  }
  body = body.cut(makeCylinder(ring.boreDiameter / 2, ringHeight + 2, [0, 0, ring.bottom - 1]));
  for (const ear of ears) {
    // Blind pilot hole for a self-tapping M3, 8 mm deep from the split plane.
    body = body.cut(makeCylinder(p.pilotHole / 2, 8, [ear.x, 1, ear.z], AXIS.y));
  }
  for (const post of layout.posts) {
    body = body.cut(makeCylinder(post.pilotDiameter / 2, post.top - post.bottom - 3, [post.x, post.y, post.bottom - 1]));
  }
  for (const c of layout.cutouts) body = body.cut(cutter(c));
  const seat = layout.diffuserSeat;
  body = body.cut(makeCylinder(seat.diameter / 2, seat.top - seat.bottom, [0, 0, seat.bottom]));
  return body;
}

/** The clamp's removable half, in its assembled position (the front of the tube, y < 0). */
export function buildHolderClamp(layout: HolderLayout): Shape3D {
  const { ring, ears, params: p } = layout;
  const ringHeight = ring.top - ring.bottom;
  let cap: Shape3D = makeCylinder(ring.outerRadius, ringHeight, [0, 0, ring.bottom]).intersect(
    box(-ring.outerRadius, ring.outerRadius, -ring.outerRadius, -ring.gap, ring.bottom - 1, ring.top + 1),
  );
  for (const ear of ears) {
    cap = cap.fuse(box(ear.x - ear.width / 2, ear.x + ear.width / 2, -ring.gap - ear.length, -ring.gap + EMBED, ring.bottom, ring.top));
  }
  cap = cap.cut(makeCylinder(ring.boreDiameter / 2, ringHeight + 2, [0, 0, ring.bottom - 1]));
  for (const ear of ears) {
    cap = cap.cut(makeCylinder(p.screwHole / 2, ear.length + ring.gap + 2, [ear.x, -ring.gap - ear.length - 1, ear.z], AXIS.y));
  }
  return cap;
}

/** Bottom plate of the light box (z from -wall to 0), with the four screw holes. */
export function buildHolderLid(layout: HolderLayout): Shape3D {
  const { box: b, lid, cradle, ledPost, params: p } = layout;
  let plate: Shape3D = box(b.xMin, b.xMax, b.yMin, b.yMax, lid.bottom, lid.top);
  // Battery cradle: a low rectangular ring around the 9 V battery.
  if (cradle) {
    const rim = box(cradle.xMin, cradle.xMax, cradle.yMin, cradle.yMax, lid.top - EMBED, lid.top + cradle.height).cut(
      box(cradle.xMin + p.cradleWall, cradle.xMax - p.cradleWall, cradle.yMin + p.cradleWall, cradle.yMax - p.cradleWall, lid.top - 1, lid.top + cradle.height + 1),
    );
    plate = plate.fuse(rim);
  }
  for (const post of layout.boardPosts) {
    plate = plate.fuse(makeCylinder(post.outerDiameter / 2, post.top + EMBED, [post.x, post.y, lid.top - EMBED]));
    plate = plate.cut(makeCylinder(p.pilotHole / 2, post.top - 1, [post.x, post.y, lid.top + 1]));
  }
  // LED post: a flange seat on top and a hole for the legs down through the lid.
  plate = plate.fuse(makeCylinder(ledPost.diameter / 2, ledPost.top - lid.top + EMBED, [ledPost.x, ledPost.y, lid.top - EMBED]));
  plate = plate.cut(makeCylinder(ledPost.seatDiameter / 2, ledPost.seatDepth + 1, [ledPost.x, ledPost.y, ledPost.top - ledPost.seatDepth]));
  plate = plate.cut(makeCylinder(ledPost.legHole / 2, ledPost.top - lid.bottom + 2, [ledPost.x, ledPost.y, lid.bottom - 1]));
  for (const hole of lid.holes) {
    plate = plate.cut(makeCylinder(p.screwHole / 2, lid.top - lid.bottom + 2, [hole.x, hole.y, lid.bottom - 1]));
  }
  return plate;
}

/** The pregoscopio as measured from the photos: tube, adapter sleeve and objective. Used for the fit check only. */
export function buildTubeProxy(layout: HolderLayout): Shape3D {
  const { tube } = layout;
  return makeCylinder(tube.radius, tube.top - tube.bottom, [0, 0, tube.bottom])
    .fuse(makeCylinder(tube.sleeveRadius, tube.bottom - tube.sleeveBottom + EMBED, [0, 0, tube.sleeveBottom]))
    .fuse(makeCylinder(tube.objectiveRadius, tube.sleeveBottom - tube.noseZ + EMBED, [0, 0, tube.noseZ]));
}

/**
 * Print orientation for the body and the clamp: turned so the face that looks toward +Y
 * (the back of the column, the clamp's mating face) rests on z = 0. The body then needs
 * 90 x 210 mm of bed instead of 210 mm of height, and the clamp opens upward.
 */
export function holderOnBack(shape: Shape3D): Shape3D {
  const turned = shape.clone().rotate(-90, [0, 0, 0], [1, 0, 0]);
  const [[, , zMin]] = turned.boundingBox.bounds;
  return turned.translate(0, 0, -zMin);
}

/** Translucent disc that sits in the seat around the window (print in natural or white PLA, 0.4-0.8 mm). */
export function buildHolderDiffuser(layout: HolderLayout): Shape3D {
  const { diffuserSeat: d } = layout;
  return makeCylinder(d.discDiameter / 2, d.discThickness, [0, 0, 0]);
}

export interface HolderShapes {
  body: Shape3D;
  clamp: Shape3D;
  lid: Shape3D;
  diffuser: Shape3D;
}

export function buildHolder(layout: HolderLayout): HolderShapes {
  return { body: buildHolderBody(layout), clamp: buildHolderClamp(layout), lid: buildHolderLid(layout), diffuser: buildHolderDiffuser(layout) };
}
