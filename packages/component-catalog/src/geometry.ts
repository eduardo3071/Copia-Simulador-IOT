import type { ComponentDefinition, PinDef } from "./types.ts";

export interface Placement {
  x: number;
  y: number;
  rotation: number;
}

/** Rotation is in degrees, about the part centre, restricted to multiples of 90. */
export function normalizeRotation(rotation: number): 0 | 90 | 180 | 270 {
  const r = ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
  return r as 0 | 90 | 180 | 270;
}

/** Breadboard-view position of a pin in canvas coordinates. */
export function pinPosition(def: ComponentDefinition, placement: Placement, pin: PinDef): { x: number; y: number } {
  const cx = def.size.width / 2;
  const cy = def.size.height / 2;
  const dx = pin.x - cx;
  const dy = pin.y - cy;
  let rx = dx;
  let ry = dy;
  switch (normalizeRotation(placement.rotation)) {
    case 90: rx = -dy; ry = dx; break;
    case 180: rx = -dx; ry = -dy; break;
    case 270: rx = dy; ry = -dx; break;
  }
  return { x: placement.x + cx + rx, y: placement.y + cy + ry };
}
/** Max distance (CSS px) between a leg and a hole for the leg to be inserted. */
export const SNAP_DISTANCE = 4;

/**
 * Which legs of a part sit on breadboard holes. Wokwi pin pitches are not exact
 * multiples of 0.1 in, hence the tolerance.
 */
export function breadboardContacts(
  def: ComponentDefinition,
  placement: Placement,
  board: ComponentDefinition,
  boardPlacement: Placement,
  maxDistance = SNAP_DISTANCE,
): { pinId: string; holeId: string }[] {
  const contacts: { pinId: string; holeId: string }[] = [];
  const holes = board.pins.map((h) => ({ id: h.id, ...pinPosition(board, boardPlacement, h) }));
  for (const pin of def.pins) {
    const p = pinPosition(def, placement, pin);
    let best: { id: string; d: number } | undefined;
    for (const hole of holes) {
      const d = Math.hypot(hole.x - p.x, hole.y - p.y);
      if (d <= maxDistance && (!best || d < best.d)) best = { id: hole.id, d };
    }
    if (best) contacts.push({ pinId: pin.id, holeId: best.id });
  }
  return contacts;
}
