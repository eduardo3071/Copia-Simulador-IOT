import type { Cutout, Enclosure, EnclosureParams, PcbLayout } from "@simiot/project-model";

/** tscircuit's default board thickness; the project model has no thickness field yet. */
export const PCB_THICKNESS = 1.6;
/** How far a cutting tool reaches past each face it goes through, so cuts never leave skins. */
export const CUT_MARGIN = 0.2;
/** Standoffs and the lid lip start this far inside the part they join, so each union is one solid. */
export const EMBED = 0.5;

export type Vec3 = [number, number, number];

export interface StandoffLayout {
  holeId: string;
  x: number;
  y: number;
  /** Hole diameter + 2 × wall. */
  outerDiameter: number;
  /** Blind pilot hole for a self-tapping screw: 80 % of the PCB hole, rounded to 0.1 mm. */
  pilotDiameter: number;
  /** Floor top. */
  bottom: number;
  /** PCB bottom. */
  top: number;
}

/** A cutting tool: a box or a cylinder along `axis`, centred at `center`, `size` along x, y, z. */
export interface CutoutLayout {
  id: string;
  part: "base" | "lid";
  shape: "rect" | "circle";
  axis: "x" | "y" | "z";
  center: Vec3;
  size: Vec3;
}

export interface LayoutIssue {
  severity: "error" | "warning";
  message: string;
}

/**
 * Every dimension of the enclosure, computed without any CAD kernel.
 * Coordinates: board centre at x = y = 0 (same as the PCB layout), z = 0 at the
 * outside of the floor, +Z up. The lid is described in its assembled position.
 */
export interface EnclosureLayout {
  params: EnclosureParams;
  pcb: { width: number; depth: number; thickness: number; bottom: number; top: number };
  inner: { width: number; depth: number };
  outer: { width: number; depth: number };
  /** Base: from z = 0 to the top of the walls. */
  baseHeight: number;
  floorTop: number;
  /** The lid plate rests on the walls; the lip hangs into the cavity. */
  lid: {
    bottom: number;
    top: number;
    lip: { outerWidth: number; outerDepth: number; innerWidth: number; innerDepth: number; bottom: number } | null;
  };
  /** Lid as printed (outer face down): z from 0 to this height. */
  lidPrintHeight: number;
  totalHeight: number;
  standoffs: StandoffLayout[];
  cutouts: CutoutLayout[];
  /** "error" = that feature was left out of the geometry; "warning" = generated, but check it. */
  issues: LayoutIssue[];
}

const round = (value: number, step: number) => Math.round(value / step) * step;
const FACE_NAMES: Record<Cutout["face"], string> = {
  front: "frente",
  back: "fundo",
  left: "esquerda",
  right: "direita",
  lid: "tampa",
};

export function enclosureLayout(pcb: PcbLayout, enclosure: Pick<Enclosure, "params" | "cutouts">): EnclosureLayout {
  const p = enclosure.params;
  const issues: LayoutIssue[] = [];
  const board = { width: pcb.board.width, depth: pcb.board.height };
  const inner = { width: board.width + 2 * p.clearance, depth: board.depth + 2 * p.clearance };
  const outer = { width: inner.width + 2 * p.wall, depth: inner.depth + 2 * p.wall };
  const floorTop = p.wall;
  const pcbBottom = floorTop + p.standoffHeight;
  const pcbTop = pcbBottom + PCB_THICKNESS;
  const baseHeight = pcbTop + p.headroom;
  const lidTop = baseHeight + p.wall;

  let lip: EnclosureLayout["lid"]["lip"] = null;
  if (p.lipHeight > 0) {
    const outerWidth = inner.width - 2 * p.fit;
    const outerDepth = inner.depth - 2 * p.fit;
    const innerWidth = outerWidth - 2 * p.wall;
    const innerDepth = outerDepth - 2 * p.wall;
    if (p.lipHeight >= p.headroom) {
      issues.push({ severity: "error", message: "A aba da tampa encostaria na placa: aumente o espaço acima da placa ou reduza a aba. Tampa gerada sem aba." });
    } else if (innerWidth <= 0 || innerDepth <= 0) {
      issues.push({ severity: "error", message: "Parede grossa demais para a aba caber no gabinete. Tampa gerada sem aba." });
    } else {
      lip = { outerWidth, outerDepth, innerWidth, innerDepth, bottom: baseHeight - p.lipHeight };
    }
  }

  const standoffs: StandoffLayout[] = [];
  for (const hole of pcb.mountingHoles) {
    if (Math.abs(hole.x) > board.width / 2 || Math.abs(hole.y) > board.depth / 2) {
      issues.push({ severity: "error", message: `Furo ${hole.id} fora da placa: suporte não gerado.` });
      continue;
    }
    const outerDiameter = hole.diameter + 2 * p.wall;
    const r = outerDiameter / 2;
    if (Math.abs(hole.x) + r > inner.width / 2 || Math.abs(hole.y) + r > inner.depth / 2) {
      issues.push({ severity: "warning", message: `Suporte do furo ${hole.id} encosta na parede e se funde a ela.` });
    }
    standoffs.push({
      holeId: hole.id,
      x: hole.x,
      y: hole.y,
      outerDiameter,
      pilotDiameter: round(hole.diameter * 0.8, 0.1),
      bottom: floorTop,
      top: pcbBottom,
    });
  }
  if (!pcb.mountingHoles.length) {
    issues.push({ severity: "warning", message: "A PCB não tem furos de montagem: o gabinete sai sem suportes." });
  }

  const cutouts: CutoutLayout[] = [];
  for (const c of enclosure.cutouts) {
    const name = c.label || c.id;
    const across = c.shape === "circle" ? c.width : c.height;
    if (c.face === "lid") {
      const bottom = (lip?.bottom ?? baseHeight) - CUT_MARGIN;
      const top = lidTop + CUT_MARGIN;
      cutouts.push({ id: c.id, part: "lid", shape: c.shape, axis: "z", center: [c.x, c.y, (bottom + top) / 2], size: [c.width, across, top - bottom] });
      if (Math.abs(c.x) + c.width / 2 > outer.width / 2 || Math.abs(c.y) + across / 2 > outer.depth / 2) {
        issues.push({ severity: "warning", message: `Recorte "${name}" passa da borda da tampa.` });
      }
      continue;
    }
    const alongX = c.face === "front" || c.face === "back";
    const sign = c.face === "front" || c.face === "left" ? -1 : 1;
    const along = alongX ? c.x : c.y;
    const z = pcbTop + c.z;
    const depth = p.wall + 2 * CUT_MARGIN;
    const wallMid = sign * ((alongX ? inner.depth : inner.width) / 2 + p.wall / 2);
    cutouts.push(
      alongX
        ? { id: c.id, part: "base", shape: c.shape, axis: "y", center: [along, wallMid, z], size: [c.width, depth, across] }
        : { id: c.id, part: "base", shape: c.shape, axis: "x", center: [wallMid, along, z], size: [depth, c.width, across] },
    );
    const span = alongX ? inner.width : inner.depth;
    if (Math.abs(along) + c.width / 2 > span / 2 || z - across / 2 < floorTop || z + across / 2 > baseHeight) {
      issues.push({ severity: "warning", message: `Recorte "${name}" passa dos limites da parede (${FACE_NAMES[c.face]}).` });
    }
  }

  return {
    params: p,
    pcb: { ...board, thickness: PCB_THICKNESS, bottom: pcbBottom, top: pcbTop },
    inner,
    outer,
    baseHeight,
    floorTop,
    lid: { bottom: baseHeight, top: lidTop, lip },
    lidPrintHeight: lidTop - (lip?.bottom ?? baseHeight),
    totalHeight: lidTop,
    standoffs,
    cutouts,
    issues,
  };
}
