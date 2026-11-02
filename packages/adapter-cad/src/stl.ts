import type { Vec3 } from "./layout.ts";

/** Triangles of a binary STL, 9 floats (3 vertices) each. Normals are ignored. */
export function readBinaryStl(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  if (buffer.byteLength < 84) throw new Error("STL binário inválido: arquivo curto.");
  const count = view.getUint32(80, true);
  if (buffer.byteLength !== 84 + count * 50) throw new Error("STL binário inválido: tamanho não bate com o número de triângulos.");
  const triangles = new Float32Array(count * 9);
  for (let t = 0; t < count; t++) {
    const offset = 84 + t * 50 + 12; // skip the normal
    for (let k = 0; k < 9; k++) triangles[t * 9 + k] = view.getFloat32(offset + k * 4, true);
  }
  return triangles;
}

export function stlBounds(triangles: Float32Array): { min: Vec3; max: Vec3; size: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < triangles.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = triangles[i + k]!;
      if (v < min[k]!) min[k] = v;
      if (v > max[k]!) max[k] = v;
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

/** Enclosed volume (mm³) by the divergence theorem; positive for outward-facing triangles. */
export function stlVolume(triangles: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < triangles.length; i += 9) {
    const v = (k: number) => triangles[i + k]!;
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = [v(0), v(1), v(2), v(3), v(4), v(5), v(6), v(7), v(8)];
    sum += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return sum / 6;
}

/**
 * Copy of a binary STL with `text` in its 80-byte header (ASCII, space padded), e.g.
 * the project revision. Must not start with "solid": readers would take it for ASCII STL.
 */
export function withStlHeader(stl: ArrayBuffer, text: string): ArrayBuffer {
  const copy = stl.slice(0);
  const bytes = new Uint8Array(copy, 0, 80);
  const ascii = text.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/^solid/i, "STL").slice(0, 80);
  bytes.fill(0x20);
  for (let i = 0; i < ascii.length; i++) bytes[i] = ascii.charCodeAt(i);
  return copy;
}