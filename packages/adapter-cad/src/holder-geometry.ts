import { draw, drawRoundedRectangle, makeBox, makeCylinder, type Shape3D } from "replicad";
import { EMBED, type Vec3 } from "./layout.ts";
import type { HolderCutout, HolderLayout } from "./holder.ts";

/** Replicad solids for a holder layout. Callers must have loaded the kernel with setOC() first. */

const AXIS: Record<HolderCutout["axis"], Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Shape3D {
  return makeBox([x0, y0, z0], [x1, y1, z1]);
}

/** Box with rounded vertical corners and, optionally, a rounded top perimeter. */
function roundedBox(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, corner: number, topEdge = 0): Shape3D {
  let shape = box(x0, x1, y0, y1, z0, z1);
  if (corner > 0) shape = shape.fillet(corner, (e) => e.inDirection("Z"));
  if (topEdge > 0) shape = shape.fillet(topEdge, (e) => e.inPlane("XY", z1));
  return shape;
}

/** Column and arm as one extruded side profile (YZ), with a rounded outer corner and a rounded inner corner under the arm. */
function columnAndArm(layout: HolderLayout): Shape3D {
  const { column, arm, params: p } = layout;
  const r = p.columnRound;
  let pen = draw([column.yMax, column.bottom]).lineTo([column.yMax, column.top]);
  if (r > 0) pen = pen.customCorner(r);
  pen = pen.lineTo([arm.yMin, column.top]).lineTo([arm.yMin, arm.bottom]).lineTo([column.yMin, arm.bottom]);
  if (r > 0) pen = pen.customCorner(r);
  return pen
    .lineTo([column.yMin, column.bottom])
    .close()
    .sketchOnPlane("YZ")
    .extrude(column.xMax - column.xMin)
    .translate(column.xMin, 0, 0) as Shape3D;
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
  const { box: b, cavity, column, ring, ears, params: p } = layout;
  let body: Shape3D = roundedBox(b.xMin, b.xMax, b.yMin, b.yMax, 0, b.height, p.cornerRadius, p.edgeRound).cut(
    roundedBox(cavity.xMin, cavity.xMax, cavity.yMin, cavity.yMax, -1, cavity.top, Math.max(p.cornerRadius - p.wall, 0)),
  );
  for (const post of layout.posts) {
    body = body.fuse(makeCylinder(post.outerDiameter / 2, post.top - post.bottom, [post.x, post.y, post.bottom]));
  }
  body = body.fuse(columnAndArm(layout));

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
    body = body.cut(makeCylinder(p.pilotHole / 2, 8.5, [ear.x, -0.5, ear.z], AXIS.y));
  }
  for (const post of layout.posts) {
    body = body.cut(makeCylinder(post.pilotDiameter / 2, post.top - post.bottom - 3, [post.x, post.y, post.bottom - 1]));
  }
  for (const c of layout.cutouts) body = body.cut(cutter(c));
  const win = layout.columnWindow;
  if (win) {
    // stadium window through the column along Y; the sketch plane XZ extrudes toward -Y
    const length = win.zMax - win.zMin;
    const hole = drawRoundedRectangle(win.width, length, win.width / 2 - 0.01).sketchOnPlane("XZ").extrude(win.yMax - win.yMin + 4) as Shape3D;
    body = body.cut(hole.translate(0, win.yMax + 2, (win.zMin + win.zMax) / 2));
  }
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
  let plate: Shape3D = roundedBox(b.xMin, b.xMax, b.yMin, b.yMax, lid.bottom, lid.top, p.cornerRadius);
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
  if (layout.hasLedPost) {
    // LED post: a flange seat on top and a hole for the legs down through the lid.
    plate = plate.fuse(makeCylinder(ledPost.diameter / 2, ledPost.top - lid.top + EMBED, [ledPost.x, ledPost.y, lid.top - EMBED]));
    plate = plate.cut(makeCylinder(ledPost.seatDiameter / 2, ledPost.seatDepth + 1, [ledPost.x, ledPost.y, ledPost.top - ledPost.seatDepth]));
    // the legs go down a blind hole and leave sideways, toward the driver board, through a slot at the foot of the post
    // (a hole through the lid would drop them outside the closed box)
    plate = plate.cut(makeCylinder(ledPost.legHole / 2, ledPost.top - lid.top, [ledPost.x, ledPost.y, lid.top + 1]));
    const reach = ledPost.diameter / 2 + 1;
    const slotY0 = ledPost.slot.dir > 0 ? ledPost.y : ledPost.y - reach;
    plate = plate.cut(box(ledPost.x - ledPost.legHole / 2, ledPost.x + ledPost.legHole / 2, slotY0, slotY0 + reach, lid.top, lid.top + ledPost.slot.height));
  }
  // 1000x version: air holes around the heatsink of the 3 W LED
  for (const v of lid.vents) {
    plate = plate.cut(makeCylinder(v.diameter / 2, lid.top - lid.bottom + 2, [v.x, v.y, lid.bottom - 1]));
  }
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

/**
 * 1000x version: a tube that stands on the lid around the LED and its heatsink, up to just under the aperture wheel. A round boss on its
 * rim carries the pin the wheel turns on, and keeps the wheel off the rim; the tube keeps the stray light off the slide. Print it black.
 */
export function buildLightTube(layout: HolderLayout): Shape3D | null {
  const t = layout.lightTube;
  if (!t) return null;
  const height = t.top - t.bottom;
  let tube: Shape3D = makeCylinder(t.outerDiameter / 2, height, [0, 0, t.bottom]).cut(makeCylinder(t.innerDiameter / 2, height + 2, [0, 0, t.bottom - 1]));
  // boss with its pin: from inside the wall up to the underside of the wheel, then the pin through the wheel
  const bossBottom = t.top - 3;
  const boss = makeCylinder(t.boss.diameter / 2, t.boss.top - bossBottom, [t.boss.x, 0, bossBottom]);
  const pin = makeCylinder(t.pin.diameter / 2, t.pin.top - t.boss.top + EMBED, [t.boss.x, 0, t.boss.top - EMBED]);
  tube = tube.fuse(boss).fuse(pin);
  // cable slot at the foot, on the +y side: the two wires of the LED come in here
  const reach = t.outerDiameter / 2 + 1;
  tube = tube.cut(box(-t.slot.halfWidth, t.slot.halfWidth, t.innerDiameter / 2 - 2, reach, t.bottom - 1, t.slot.height));
  return tube;
}

/**
 * Aperture wheel: a flat disc with five holes on a circle around its pivot; the hole facing the optical axis sets the opening.
 * Drawn in its assembled place (pivot on the pin) and turned so the first hole faces the axis; print it flat.
 */
export function buildApertureWheel(layout: HolderLayout, hole = 0): Shape3D | null {
  const t = layout.lightTube;
  if (!t) return null;
  const w = t.wheel;
  let disc: Shape3D = makeCylinder(w.radius, w.thickness, [0, 0, 0]);
  disc = disc.cut(makeCylinder(w.pinHole / 2, w.thickness + 2, [0, 0, -1]));
  for (const h of w.holes) disc = disc.cut(makeCylinder(h.diameter / 2, w.thickness + 2, [h.x, h.y, -1]));
  // grip: twelve shallow notches on the rim
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    disc = disc.cut(makeCylinder(1, w.thickness + 2, [Math.cos(a) * (w.radius + 0.2), Math.sin(a) * (w.radius + 0.2), -1]));
  }
  // turn so that hole `hole` faces the optical axis (which is at 180 degrees from the pin), then put the pivot on the pin
  const turn = (Math.PI - w.holes[hole]!.angle) * (180 / Math.PI);
  return disc.rotate(turn, [0, 0, 0], [0, 0, 1]).translate(w.pivotX, 0, w.bottom);
}

/** The wheel lying flat at the origin, for printing. */
export function apertureWheelOnBed(layout: HolderLayout): Shape3D | null {
  const t = layout.lightTube;
  if (!t) return null;
  const w = buildApertureWheel(layout);
  return w ? w.translate(-t.wheel.pivotX, 0, -t.wheel.bottom) : null;
}

export interface HolderShapes {
  body: Shape3D;
  clamp: Shape3D;
  lid: Shape3D;
  diffuser: Shape3D;
  lightTube: Shape3D | null;
  wheel: Shape3D | null;
}

export function buildHolder(layout: HolderLayout): HolderShapes {
  return { body: buildHolderBody(layout), clamp: buildHolderClamp(layout), lid: buildHolderLid(layout), diffuser: buildHolderDiffuser(layout), lightTube: buildLightTube(layout), wheel: buildApertureWheel(layout) };
}
