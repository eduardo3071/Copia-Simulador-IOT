import { z } from "zod";

export const SCHEMA_VERSION = 2;

const ParamValue = z.union([z.string(), z.number(), z.boolean()]);

export const Point = z.object({ x: z.number(), y: z.number() });
export type Point = z.infer<typeof Point>;

/** A terminal is a pin of a component instance: `componentId` + catalog `pinId`. */
export const TerminalRef = z.object({ componentId: z.string(), pinId: z.string() });
export type TerminalRef = z.infer<typeof TerminalRef>;

export const ComponentInstance = z.object({
  id: z.string(),
  definitionId: z.string(),
  definitionVersion: z.number().int().positive(),
  /** Reference designator shown in schematic/BOM, e.g. R1, D1. */
  refDes: z.string(),
  params: z.record(z.string(), ParamValue),
  /** Selected footprint; undefined = catalog default. */
  footprint: z.string().optional(),
});
export type ComponentInstance = z.infer<typeof ComponentInstance>;

/**
 * Electrical connectivity, independent of any view.
 * - "wire": a jumper drawn by the user.
 * - "contact": a component leg inserted in a breadboard hole.
 */
export const Connection = z.object({
  id: z.string(),
  a: TerminalRef,
  b: TerminalRef,
  kind: z.enum(["wire", "contact"]),
});
export type Connection = z.infer<typeof Connection>;

export const Placement = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
});
export type Placement = z.infer<typeof Placement>;

export const BreadboardLayout = z.object({
  /** CSS pixels at 96 dpi, the unit used by the wokwi elements (0.1 in = 9.6 px). */
  unit: z.literal("css-px"),
  placements: z.record(z.string(), Placement),
  wires: z.record(
    z.string(),
    z.object({ color: z.string(), points: z.array(Point).default([]) }),
  ),
});
export type BreadboardLayout = z.infer<typeof BreadboardLayout>;

export const SchematicLayout = z.object({
  unit: z.literal("schematic-unit"),
  /** Missing placements are auto-laid out by the EDA adapter. */
  placements: z.record(z.string(), Placement),
});
export type SchematicLayout = z.infer<typeof SchematicLayout>;

/** Non-plated hole through the board for a screw; centre in board coordinates (mm). */
export const MountingHole = z.object({ id: z.string(), x: z.number(), y: z.number(), diameter: z.number().positive() });
export type MountingHole = z.infer<typeof MountingHole>;

export const PcbLayout = z.object({
  unit: z.literal("mm"),
  /** Coordinates are relative to the board centre, +Y up (tscircuit convention). */
  origin: z.literal("board-center"),
  board: z.object({ width: z.number().positive(), height: z.number().positive() }),
  layers: z.literal(2),
  placements: z.record(
    z.string(),
    Placement.extend({ layer: z.enum(["top", "bottom"]).default("top") }),
  ),
  mountingHoles: z.array(MountingHole),
});
export type PcbLayout = z.infer<typeof PcbLayout>;

export const SourceFile = z.object({ path: z.string(), content: z.string() });
export type SourceFile = z.infer<typeof SourceFile>;

export const FirmwareProject = z.object({
  /** Fully qualified board name, e.g. arduino:avr:uno. */
  fqbn: z.string(),
  /** Pinned core, e.g. arduino:avr@1.8.6. */
  core: z.string(),
  mainFile: z.string(),
  files: z.array(SourceFile).min(1),
  libraries: z.array(z.object({ name: z.string(), version: z.string() })),
});
export type FirmwareProject = z.infer<typeof FirmwareProject>;

export const SimulationConfig = z.object({
  engine: z.literal("avr8js"),
  engineVersion: z.string(),
  clockHz: z.number().positive(),
  /** 1 = real time. */
  speed: z.number().positive(),
});
export type SimulationConfig = z.infer<typeof SimulationConfig>;

/** Wall (or lid) an enclosure cutout goes through. Front = −Y side, back = +Y, left = −X, right = +X. */
export const CutoutFace = z.enum(["front", "back", "left", "right", "lid"]);
export type CutoutFace = z.infer<typeof CutoutFace>;

/**
 * A hole placed by hand by the user; never inferred from how parts look.
 * The centre is in board coordinates (mm, origin at the board centre, +Y up), with
 * z measured from the PCB top surface. The axis normal to the face is ignored:
 * front/back use x,z; left/right use y,z; the lid uses x,y.
 * `width` runs along the face's horizontal axis, `height` along its vertical one
 * (z on walls, y on the lid). Circles use `width` as the diameter.
 */
export const Cutout = z.object({
  id: z.string(),
  label: z.string().max(60),
  face: CutoutFace,
  shape: z.enum(["rect", "circle"]),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type Cutout = z.infer<typeof Cutout>;

/** All lengths in mm. */
export const EnclosureParams = z.object({
  /** Wall, floor and lid thickness. */
  wall: z.number().positive().max(20),
  /** Gap between the PCB edge and the inner wall, per side. */
  clearance: z.number().nonnegative().max(50),
  /** Floor top to PCB bottom (standoff height). */
  standoffHeight: z.number().positive().max(100),
  /** PCB top to the underside of the lid. */
  headroom: z.number().positive().max(200),
  /** Height of the locating lip under the lid (0 = flat lid). */
  lipHeight: z.number().nonnegative().max(50),
  /** Gap between the lip and the inner wall, per side. */
  fit: z.number().nonnegative().max(5),
});
export type EnclosureParams = z.infer<typeof EnclosureParams>;

/**
 * Parametric base + lid fitted to the PCB outline and mounting holes. Geometry is
 * derived (adapter-cad); only the parameters and the manual cutouts are stored.
 */
export const Enclosure = z.object({
  params: EnclosureParams,
  cutouts: z.array(Cutout),
  /** enclosureInputsKey() of the PCB the enclosure was last generated from. */
  pcbInputsKey: z.string(),
  /** Project revision at that generation. */
  sourceRevision: z.number().int().nonnegative(),
});
export type Enclosure = z.infer<typeof Enclosure>;

/** A derived result, tagged with the inputs it was generated from. */
export const ArtifactRef = z.object({
  hash: z.string(),
  inputsKey: z.string(),
  sourceRevision: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type ArtifactRef = z.infer<typeof ArtifactRef>;

export const Project = z.object({
  id: z.string(),
  schemaVersion: z.literal(SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  title: z.string().min(1).max(200),
  createdAt: z.string(),
  updatedAt: z.string(),
  components: z.array(ComponentInstance),
  connections: z.array(Connection),
  breadboard: BreadboardLayout,
  schematic: SchematicLayout,
  pcb: PcbLayout,
  firmware: FirmwareProject,
  simulation: SimulationConfig,
  /** null = the project has no enclosure yet. */
  enclosure: Enclosure.nullable(),
  artifacts: z.object({
    firmware: ArtifactRef.optional(),
  }),
});
export type Project = z.infer<typeof Project>;
