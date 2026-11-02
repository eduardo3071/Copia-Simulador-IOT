import type { Enclosure, PcbLayout } from "@simiot/project-model";
import type { EnclosureLayout } from "./layout.ts";

/** Bump on any incompatible change to the messages below. */
export const CAD_PROTOCOL_VERSION = 1;

/** Indexed triangle mesh, ready for a three.js BufferGeometry. */
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export interface PartOutput {
  /** For display: the part in its assembled position. */
  mesh: MeshData;
  /** Binary STL in print orientation (base as is; lid outer face down). */
  stl: ArrayBuffer;
}

export type ToCadWorker = { v: 1; type: "build"; requestId: number; pcb: PcbLayout; enclosure: Enclosure };

export type FromCadWorker =
  | { v: 1; type: "built"; requestId: number; layout: EnclosureLayout; base: PartOutput; lid: PartOutput; durationMs: number }
  | { v: 1; type: "error"; requestId: number; message: string };
