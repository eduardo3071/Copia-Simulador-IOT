/**
 * Models of the parts of the economical 1000x version. Dimensions come from `componentes1000x()` (adapter-cad), where each one is
 * marked as taken from a page, measured, calculated or assumed. Every model is drawn in its own frame, +z up.
 */
import { useMemo } from "react";
import { DoubleSide, ExtrudeGeometry, Path, Shape } from "three";
import { useMat } from "./mat.ts";
import { Ball, Box, Cyl, type V3 } from "./parts3d.tsx";

const METAL = { metal: 0.65, rough: 0.28 } as const;

/**
 * 100x/1.25 oil achromat (160/0.17, RMS): origin at the front tip, +z toward the tube, `length` mm to the shoulder
 * (the 3 mm of RMS thread above it are inside the inner tube). White band: the colour code of 100x.
 */
export function Objective100({ length, radius = 10 }: { length: number; radius?: number }) {
  const top = length;
  return (
    <group>
      {/* spring-loaded front sleeve and the tapered nose */}
      <Cyl r={3.2} len={3} pos={[0, 0, 1.5]} color="#cfd5dc" extra={METAL} />
      <Cyl r={3.2} len={0.2} pos={[0, 0, 0.02]} color="#0b1015" seg={24} />
      <Cyl r={8} r2={3.2} len={8} pos={[0, 0, 7]} color="#c3c9d1" extra={METAL} />
      <Cyl r={radius - 0.5} len={10} pos={[0, 0, 16]} color="#15181d" extra={{ rough: 0.8 }} />
      {Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2).map((a, i) => (
        <Box key={i} size={[0.9, 0.5, 9.6]} pos={[Math.cos(a) * (radius - 0.4), Math.sin(a) * (radius - 0.4), 16]} rot={[0, 0, a + Math.PI / 2]} color="#0c0e12" />
      ))}
      <Cyl r={radius} len={5} pos={[0, 0, 23.5]} color="#d9dee5" extra={METAL} />
      <Cyl r={radius + 0.25} len={1.2} pos={[0, 0, 27.1]} color="#f4f4f4" />
      <Cyl r={radius + 0.15} len={top - 27.7 - 1.4} pos={[0, 0, 27.7 + (top - 27.7 - 1.4) / 2]} color="#cdd3da" extra={METAL} />
      <Box size={[7.5, 0.12, 3.4]} pos={[0, -(radius + 0.2), 33.5]} color="#10131a" />
      <Box size={[6, 0.12, 2.4]} pos={[0, -(radius + 0.2), 38]} color="#10131a" />
      <Cyl r={radius - 0.4} len={1.4} pos={[0, 0, top - 0.7]} color="#aeb5be" extra={METAL} />
    </group>
  );
}

/** 3 W LED on its aluminium star: origin at the underside of the star, +z up. */
export function LedStar3W({ diameter, thickness, lit }: { diameter: number; thickness: number; lit: boolean }) {
  const r = diameter / 2;
  const top = thickness;
  return (
    <group>
      <Cyl r={r} len={thickness} pos={[0, 0, thickness / 2]} color="#dfe3e8" extra={{ metal: 0.6, rough: 0.35 }} />
      {/* three-lobed star: notches at 120 degrees */}
      {[0, 1, 2].map((k) => {
        const a = (k * 2 * Math.PI) / 3 + Math.PI / 2;
        return <Box key={k} size={[2.6, 2.6, thickness + 0.02]} pos={[Math.cos(a) * (r - 1), Math.sin(a) * (r - 1), thickness / 2]} rot={[0, 0, a]} color="#8b929c" />;
      })}
      {/* solder pads, + and - */}
      <Box size={[3.6, 2.2, 0.1]} pos={[-r + 4.2, -3.8, top + 0.05]} color="#d86a4a" />
      <Box size={[3.6, 2.2, 0.1]} pos={[r - 4.2, -3.8, top + 0.05]} color="#4a6fd8" />
      {/* emitter: ceramic base, phosphor and a clear dome */}
      <Box size={[6.4, 6.4, 0.9]} pos={[0, 0, top + 0.45]} color="#f2f0ea" />
      <Cyl r={2.4} len={0.6} pos={[0, 0, top + 1.1]} color={lit ? "#fff6df" : "#e8d27a"} extra={lit ? { emissive: "#fff2c8" } : undefined} />
      <Ball r={3} pos={[0, 0, top + 0.9]} color="#f6f6f4" scale={[1, 1, 0.8]} extra={{ opacity: 0.55, rough: 0.2 }} />
    </group>
  );
}

/** Round finned heatsink: origin at the underside, +z up. */
export function Heatsink({ diameter, height }: { diameter: number; height: number }) {
  const r = diameter / 2;
  const base = 2.5;
  const fin = height - base;
  return (
    <group>
      <Cyl r={r} len={base} pos={[0, 0, base / 2]} color="#b9c0c9" extra={METAL} />
      {Array.from({ length: 16 }, (_, k) => (k / 16) * Math.PI * 2).map((a, k) => (
        <Box key={k} size={[r - 3, 1, fin]} pos={[Math.cos(a) * ((r - 3) / 2 + 2), Math.sin(a) * ((r - 3) / 2 + 2), base + fin / 2]} rot={[0, 0, a]} color="#aab2bc" extra={METAL} />
      ))}
      <Cyl r={3} len={fin} pos={[0, 0, base + fin / 2]} color="#aab2bc" extra={METAL} />
    </group>
  );
}

/** Constant-current driver module (buck): origin at the underside of its board, +z up. */
export function DriverModule({ size }: { size: V3 }) {
  const [w, d, h] = size;
  return (
    <group>
      <Box size={[w, d, 1.2]} pos={[0, 0, 0.6]} color="#1d5fa8" extra={{ rough: 0.5 }} />
      <Cyl r={Math.min(w, d) * 0.28} len={h - 2.4} pos={[-w * 0.18, 0, 1.2 + (h - 2.4) / 2]} color="#262a31" extra={{ rough: 0.7 }} />
      <Box size={[w * 0.22, d * 0.32, 1.6]} pos={[w * 0.28, d * 0.2, 2]} color="#14171c" />
      <Box size={[w * 0.18, d * 0.24, 1.2]} pos={[w * 0.3, -d * 0.2, 1.8]} color="#14171c" />
      {[-1, 1].map((s) => <Cyl key={s} r={0.9} len={0.1} pos={[s * (w / 2 - 2), d / 2 - 2, 1.25]} color="#d8d8d0" seg={14} />)}
      {[-1, 1].map((s) => <Cyl key={`b${s}`} r={0.9} len={0.1} pos={[s * (w / 2 - 2), -d / 2 + 2, 1.25]} color="#d8d8d0" seg={14} />)}
    </group>
  );
}

/**
 * Printed aperture wheel: a flat disc with a pin hole at the origin and one hole per aperture (positions in the wheel frame).
 * Origin at the underside of the wheel, +z up.
 */
export function ApertureWheel({ radius, thickness, pinHole, holes }: { radius: number; thickness: number; pinHole: number; holes: { x: number; y: number; diameter: number }[] }) {
  const m = useMat();
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const cut = (x: number, y: number, r: number) => {
      const path = new Path();
      path.absarc(x, y, r, 0, Math.PI * 2, true);
      shape.holes.push(path);
    };
    cut(0, 0, pinHole / 2);
    for (const h of holes) cut(h.x, h.y, h.diameter / 2);
    return new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 48 });
  }, [radius, thickness, pinHole, holes]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...m("#8fb7e6", { rough: 0.6 })} side={DoubleSide} />
    </mesh>
  );
}

/** 1N5819 standing in the air between the + lug of the jack and its wire: origin at the anode end, the body along +y, `length` mm of leads and body. */
export function DiodeInline({ length, bodyLength = 5.2 }: { length: number; bodyLength?: number }) {
  const mid = length / 2;
  return (
    <group>
      <Cyl r={1.35} len={bodyLength} axis="y" pos={[0, mid, 0]} color="#1d2027" extra={{ rough: 0.45 }} />
      <Cyl r={1.4} len={0.9} axis="y" pos={[0, mid + bodyLength / 2 - 0.45, 0]} color="#d5dae0" extra={{ metal: 0.6 }} />
      <Cyl r={0.3} len={mid - bodyLength / 2} axis="y" pos={[0, (mid - bodyLength / 2) / 2, 0]} color="#c9ced6" extra={METAL} />
      <Cyl r={0.3} len={mid - bodyLength / 2} axis="y" pos={[0, length - (mid - bodyLength / 2) / 2, 0]} color="#c9ced6" extra={METAL} />
    </group>
  );
}
