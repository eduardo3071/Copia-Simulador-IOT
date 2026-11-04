/**
 * Models of the purchased parts: dimensions are the catalogue ones (LED 5 mm, TO-220, 1/4 W resistor, DO-41, KCD1-101,
 * DC-022B, WH148, 6F22). Every model is drawn in its own frame and placed by the scene; colours come from the scene's material.
 */
import { useMemo, type ReactNode } from "react";
import { CatmullRomCurve3, CurvePath, DoubleSide, LineCurve3, QuadraticBezierCurve3, Quaternion, TubeGeometry, Vector2, Vector3 } from "three";
import { useMat } from "./mat.ts";

export type V3 = [number, number, number];
const HALF = Math.PI / 2;

interface Place {
  pos?: V3;
  rot?: V3;
}

type Extra = { opacity?: number; emissive?: string; metal?: number; rough?: number };

export function Box({ size, pos, rot, color, extra }: Place & { size: V3; color: string; extra?: Extra }) {
  const m = useMat();
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={size} />
      <meshStandardMaterial {...m(color, extra)} />
    </mesh>
  );
}

/** Cylinder along `axis` (x, y or z), centred on `pos`. */
export function Cyl({ r, len, axis = "z", pos, color, seg = 28, r2, extra }: { r: number; len: number; axis?: "x" | "y" | "z"; pos?: V3; color: string; seg?: number; r2?: number; extra?: Extra }) {
  const m = useMat();
  const rot: V3 = axis === "z" ? [HALF, 0, 0] : axis === "x" ? [0, 0, HALF] : [0, 0, 0];
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[r2 ?? r, r, len, seg]} />
      <meshStandardMaterial {...m(color, extra)} />
    </mesh>
  );
}

export function Ball({ r, pos, color, scale, extra }: { r: number; pos: V3; color: string; scale?: V3; extra?: Extra }) {
  const m = useMat();
  return (
    <mesh position={pos} scale={scale}>
      <sphereGeometry args={[r, 16, 10]} />
      <meshStandardMaterial {...m(color, extra)} />
    </mesh>
  );
}

/** Cylinder between two points (leads, wire pieces). */
export function Rod({ a, b, r, color, extra }: { a: V3; b: V3; r: number; color: string; extra?: Extra }) {
  const m = useMat();
  const from = new Vector3(...a);
  const to = new Vector3(...b);
  const length = from.distanceTo(to);
  if (length < 1e-6) return null;
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return (
    <mesh position={from.clone().add(to).multiplyScalar(0.5)} quaternion={quaternion}>
      <cylinderGeometry args={[r, r, length, 12]} />
      <meshStandardMaterial {...m(color, extra)} />
    </mesh>
  );
}

/** Solid of revolution around z: profile is [radius, height] pairs. */
export function Lathe({ profile, pos, color, extra }: { profile: [number, number][]; pos?: V3; color: string; extra?: Extra }) {
  const m = useMat();
  const points = useMemo(() => profile.map(([x, y]) => new Vector2(x, y)), [profile]);
  return (
    <mesh position={pos} rotation={[HALF, 0, 0]}>
      <latheGeometry args={[points, 40]} />
      <meshStandardMaterial {...m(color, extra)} side={DoubleSide} />
    </mesh>
  );
}

/** Polyline with every corner rounded by a quadratic curve of up to `radius` mm: wires bend, they do not loop. */
function roundedPath(points: V3[], radius: number) {
  const pts = points.map((p) => new Vector3(...p));
  const path = new CurvePath<Vector3>();
  let cursor = pts[0]!.clone();
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]!;
    const here = pts[i]!;
    const next = pts[i + 1]!;
    const r = Math.min(radius, prev.distanceTo(here) / 2, here.distanceTo(next) / 2);
    const a = here.clone().add(prev.clone().sub(here).normalize().multiplyScalar(r));
    const b = here.clone().add(next.clone().sub(here).normalize().multiplyScalar(r));
    if (cursor.distanceTo(a) > 1e-6) path.add(new LineCurve3(cursor.clone(), a));
    path.add(new QuadraticBezierCurve3(a, here.clone(), b));
    cursor = b;
  }
  const last = pts[pts.length - 1]!;
  if (cursor.distanceTo(last) > 1e-6) path.add(new LineCurve3(cursor, last));
  return path;
}

/** A tube through points: smooth (cables) or with rounded corners (`round` mm, wires). */
export function Tube({ points, r, color, extra, round }: { points: V3[]; r: number; color: string; extra?: Extra; round?: number }) {
  const m = useMat();
  const geometry = useMemo(() => {
    const curve = round ? roundedPath(points, round) : new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, "centripetal");
    return new TubeGeometry(curve, Math.max(40, points.length * 16), r, 10, false);
  }, [points, r, round]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial {...m(color, extra)} />
    </mesh>
  );
}

const STEEL = "#c9ced6";
const TIN = "#d8dde3";
const COPPER = "#d9a441";

/** Lead of a through-hole part: from the body, sideways over the pad, then down into the board. */
function Lead({ from, to, r = 0.3 }: { from: V3; to: V3; r?: number }) {
  return (
    <>
      <Rod a={from} b={[to[0], to[1], from[2]]} r={r} color={STEEL} />
      <Rod a={[to[0], to[1], from[2]]} b={to} r={r} color={STEEL} />
    </>
  );
}

/** 5 mm white diffuse LED: origin at the bottom of the flange, +z up (8 mm to the top of the dome). */
export function Led5({ lit }: { lit: boolean }) {
  const glow = lit ? "#ffd27a" : undefined;
  const dome: [number, number][] = [[0, 0], [2.5, 0], [2.5, 4.5]];
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * HALF;
    dome.push([2.5 * Math.cos(a), 4.5 + 2.5 * Math.sin(a)]);
  }
  return (
    <group>
      <Cyl r={2.9} len={1} pos={[0, 0, 0.5]} color="#f4efe2" extra={{ emissive: glow }} />
      <Lathe profile={dome} pos={[0, 0, 1]} color="#fff6df" extra={{ emissive: glow, opacity: 0.95 }} />
      {/* die and anvil inside the lens */}
      <Cyl r={0.35} len={1.6} pos={[0, 0, 2.2]} color="#8c8f94" />
      <Box size={[1.1, 1.1, 0.5]} pos={[0, 0, 3.2]} color="#e8d9a8" extra={{ emissive: glow }} />
      {/* legs, the anode (long) at +x */}
      <Cyl r={0.26} len={26} pos={[1.27, 0, -12]} color={STEEL} seg={10} />
      <Cyl r={0.26} len={24} pos={[-1.27, 0, -11]} color={STEEL} seg={10} />
    </group>
  );
}

/** 1/4 W axial resistor, body along x, `span` between the pads; origin at the board surface. */
export function Resistor({ span, bands }: { span: number; bands: string[] }) {
  const z = 1.4;
  const body: [number, number][] = [[0, -3.15], [0.9, -3.15], [1.15, -2.7], [1.15, 2.7], [0.9, 3.15], [0, 3.15]];
  return (
    <group>
      <group position={[0, 0, z]} rotation={[0, HALF, 0]}>
        <Lathe profile={body} color="#d8c9a3" extra={{ rough: 0.7 }} />
      </group>
      
      {bands.map((c, i) => (
        <Cyl key={i} r={1.2} len={0.42} axis="x" pos={[-2.2 + i * 0.95 + (i === bands.length - 1 ? 0.45 : 0), 0, z]} color={c} seg={20} />
      ))}
      <Lead from={[-3.15, 0, z]} to={[-span / 2, 0, -1.6]} />
      <Lead from={[3.15, 0, z]} to={[span / 2, 0, -1.6]} />
    </group>
  );
}

/** Multilayer ceramic capacitor 100 nF, leads on 5.08 mm. */
export function Ceramic({ span }: { span: number }) {
  return (
    <group>
      <Box size={[5, 2.6, 5.4]} pos={[0, 0, 4.4]} color="#d9a441" extra={{ rough: 0.55 }} />
      <Box size={[4.2, 0.06, 1.6]} pos={[0, -1.33, 4.8]} color="#6b4a14" />
      <Rod a={[-span / 2, 0, -1.6]} b={[-span / 2, 0, 1.8]} r={0.27} color={STEEL} />
      <Rod a={[span / 2, 0, -1.6]} b={[span / 2, 0, 1.8]} r={0.27} color={STEEL} />
      <Rod a={[-span / 2, 0, 1.8]} b={[-1.7, 0, 3.4]} r={0.27} color={STEEL} />
      <Rod a={[span / 2, 0, 1.8]} b={[1.7, 0, 3.4]} r={0.27} color={STEEL} />
    </group>
  );
}

/** 1N5819 in a DO-41 case; the band marks the cathode, which is the +x side. */
export function Diode({ span }: { span: number }) {
  const z = 1.6;
  return (
    <group>
      <Cyl r={1.35} len={5.2} axis="x" pos={[0, 0, z]} color="#1d2027" extra={{ rough: 0.45 }} />
      <Cyl r={1.4} len={0.9} axis="x" pos={[2, 0, z]} color="#d5dae0" extra={{ metal: 0.6 }} />
      <Lead from={[-2.6, 0, z]} to={[-span / 2, 0, -1.6]} />
      <Lead from={[2.6, 0, z]} to={[span / 2, 0, -1.6]} />
    </group>
  );
}

/** LM317T in a TO-220: pins ADJ, OUT, IN from left to right looking at the label (-y). */
export function To220({ pitch = 2.6 }: { pitch?: number }) {
  const lift = 3;
  return (
    <group>
      {[-pitch, 0, pitch].map((x, i) => (
        <group key={i}>
          <Rod a={[x, 0, -1.6]} b={[x, 0, lift]} r={0.4} color={TIN} />
        </group>
      ))}
      <Box size={[10, 4.5, 9.2]} pos={[0, 0, lift + 4.6]} color="#23272f" extra={{ rough: 0.5 }} />
      <Box size={[6.2, 0.06, 3]} pos={[0, -2.27, lift + 5.2]} color="#9aa3b2" />
      <Box size={[10, 1.3, 6.4]} pos={[0, 1.7, lift + 9.2 + 3.2 - 0.2]} color="#b8bfca" extra={{ metal: 0.5, rough: 0.35 }} />
      <Cyl r={1.9} len={1.4} axis="y" pos={[0, 1.7, lift + 9.2 + 3.7]} color="#6d7480" seg={20} />
      <Box size={[8, 0.9, 0.8]} pos={[0, 1.6, lift + 9.2 - 0.1]} color="#aab2bd" />
    </group>
  );
}

export interface PcbProps {
  width: number;
  height: number;
  pads: [number, number, number][];
  holes: [number, number][];
  traces: { layer: "top" | "bottom"; width: number; points: [number, number][] }[];
}

/** The driver board: green FR-4 with the copper traces under the mask, tin-plated pads and the four M3 holes. Origin at the bottom. */
export function Pcb({ width, height, pads, holes, traces }: PcbProps) {
  return (
    <group>
      <Box size={[width, height, 1.6]} pos={[0, 0, 0.8]} color="#1f7a4f" extra={{ rough: 0.5 }} />
      {traces.map((t, k) =>
        t.points.slice(0, -1).map((p, i) => {
          const q = t.points[i + 1]!;
          const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (len < 0.01) return null;
          return <Box key={`${k}-${i}`} size={[len + t.width, t.width, 0.04]} pos={[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, t.layer === "top" ? 1.62 : -0.02]} rot={[0, 0, Math.atan2(q[1] - p[1], q[0] - p[0])]} color="#2f9a68" />;
        }),
      )}
      {pads.map(([x, y, d], i) => (
        <group key={i}>
          <Cyl r={1.3} len={0.07} pos={[x, y, 1.63]} color={TIN} seg={24} extra={{ metal: 0.5, rough: 0.35 }} />
          <Cyl r={d / 2} len={0.09} pos={[x, y, 1.65]} color="#0d1b14" seg={16} />
        </group>
      ))}
      {holes.map(([x, y], i) => (
        <Cyl key={i} r={1.6} len={0.09} pos={[x, y, 1.65]} color="#0d1b14" seg={20} />
      ))}
    </group>
  );
}

/** Pan-head M3 screw seen from the head side, +z up from the surface. */
export function Screw({ r = 2.8 }: { r?: number }) {
  const head: [number, number][] = [[0, 2], [r * 0.6, 2], [r * 0.95, 1.4], [r, 0.9], [r, 0]];
  return (
    <group>
      <Lathe profile={head} pos={[0, 0, 0]} color={STEEL} extra={{ metal: 0.5, rough: 0.4 }} />
      <Box size={[r * 1.4, 0.45, 0.3]} pos={[0, 0, 2]} color="#4b5260" />
      <Box size={[0.45, r * 1.4, 0.3]} pos={[0, 0, 2]} color="#4b5260" />
    </group>
  );
}

/**
 * KCD1-101 rocker switch. Frame: origin at the centre of the cut-out on the outer face of the wall, +y into the box, +z up.
 * Terminals leave at the back; their tips are at y = 21.4.
 */
export function RockerSwitch() {
  return (
    <group>
      <Box size={[24.6, 1.4, 18.6]} pos={[0, -0.7, 0]} color="#1d2027" />
      <Box size={[21, 13.4, 14.6]} pos={[0, 6.7, 0]} color="#23272f" extra={{ rough: 0.5 }} />
      {/* snap tabs that hold it in the 2.4 mm wall */}
      <Box size={[1.2, 3, 3]} pos={[-10.8, 2.6, 0]} color="#3a404c" />
      <Box size={[1.2, 3, 3]} pos={[10.8, 2.6, 0]} color="#3a404c" />
      {/* the rocker, tilted */}
      <group position={[0, -3.4, 0]} rotation={[0.16, 0, 0]}>
        <Box size={[19, 5.6, 13]} color="#d9362b" extra={{ rough: 0.35 }} />
        <Box size={[16, 0.1, 0.9]} pos={[0, -2.82, 3.2]} color="#fff4f2" />
        <Cyl r={1.5} len={0.1} axis="y" pos={[0, -2.82, -3.2]} color="#fff4f2" seg={20} />
      </group>
      {/* terminals */}
      {[-3.5, 3.5].map((x) => (
        <group key={x}>
          <Box size={[4.8, 8, 0.8]} pos={[x, 17.4, -3]} color="#e1c27a" extra={{ metal: 0.6, rough: 0.3 }} />
          <Cyl r={0.7} len={0.9} axis="z" pos={[x, 19.8, -3]} color="#3b3f47" seg={14} />
        </group>
      ))}
    </group>
  );
}

/**
 * DC-022B panel jack for a 5.5 x 2.1 mm plug. Frame as the switch: origin on the outer face of the wall, +y into the box.
 * Tips of the two lugs are at y = 21.4.
 */
export function PowerJack() {
  return (
    <group>
      <Cyl r={5.4} len={1.4} axis="y" pos={[0, -0.7, 0]} color="#c9ced6" seg={6} extra={{ metal: 0.5, rough: 0.35 }} />
      <Cyl r={3.6} len={5} axis="y" pos={[0, 1.2, 0]} color="#1d2027" />
      <Cyl r={2.7} len={0.2} axis="y" pos={[0, -0.05, 0]} color="#0b0c10" seg={24} />
      <Cyl r={1} len={7} axis="y" pos={[0, 3, 0]} color="#d5dae0" seg={14} />
      <Box size={[9, 12.4, 11]} pos={[0, 8.2, 0]} color="#23272f" extra={{ rough: 0.5 }} />
      {[3.2, -3.2].map((x) => (
        <Box key={x} size={[0.9, 7.6, 4.2]} pos={[x, 17.6, -3]} color="#e1c27a" extra={{ metal: 0.6, rough: 0.3 }} />
      ))}
    </group>
  );
}

/**
 * WH148 panel potentiometer with its knob. Frame as the switch: origin on the outer face of the wall, +y into the box.
 * The three lugs end at y = 16.4, 8 mm below the axis.
 */
export function Pot() {
  const ridges = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2);
  return (
    <group>
      {/* knob, outside */}
      <group position={[0, -7, 0]}>
        <Cyl r={7.4} len={9} axis="y" color="#2a303b" seg={40} />
        <Cyl r={6.2} len={0.2} axis="y" pos={[0, -4.55, 0]} color="#3a4252" seg={40} />
        {ridges.map((a, i) => (
          <Box key={i} size={[1.4, 8, 1]} pos={[Math.cos(a) * 7.4, 0, Math.sin(a) * 7.4]} rot={[0, -a, 0]} color="#2a303b" />
        ))}
        <Box size={[1.2, 0.2, 5]} pos={[0, -4.6, 4.5]} color="#f4f1e6" />
      </group>
      {/* nut and bushing in the wall */}
      <Cyl r={5} len={1.6} axis="y" pos={[0, -0.8, 0]} color="#c9ced6" seg={6} extra={{ metal: 0.5, rough: 0.35 }} />
      <Cyl r={3.5} len={5} axis="y" pos={[0, 1.2, 0]} color="#d5dae0" extra={{ metal: 0.5, rough: 0.35 }} />
      {/* body inside, with its terminal lugs */}
      <Cyl r={8} len={9} axis="y" pos={[0, 6.9, 0]} color="#7b838f" seg={40} extra={{ metal: 0.3, rough: 0.5 }} />
      <Cyl r={7.3} len={0.4} axis="y" pos={[0, 11.5, 0]} color="#3a404c" seg={40} />
      {[-5, 0, 5].map((x) => (
        <Box key={x} size={[2, 5.4, 0.7]} pos={[x, 13.7, -8]} color="#e1c27a" extra={{ metal: 0.6, rough: 0.3 }} />
      ))}
    </group>
  );
}

/** 9 V battery (6F22) lying on the lid with its snap clip; origin at the centre of the battery on the lid. */
export function Battery() {
  return (
    <group>
      <Box size={[48.5, 26.5, 17.5]} pos={[0, 0, 8.75]} color="#3b4757" extra={{ rough: 0.45, metal: 0.2 }} />
      <Box size={[30, 26.6, 9]} pos={[4, 0, 8.75]} color="#e8872b" extra={{ rough: 0.4 }} />
      <Box size={[30.2, 26.7, 0.4]} pos={[4, 0, 13.4]} color="#1d2430" />
      <Box size={[4, 26.7, 17.6]} pos={[-22, 0, 8.75]} color="#2e3846" />
      {/* the two terminals and the snap clip on top of them */}
      <Cyl r={3.1} len={1.6} pos={[-18.5, -6.35, 18.3]} color="#d5dae0" seg={6} extra={{ metal: 0.6 }} />
      <Cyl r={3.2} len={1.6} pos={[-18.5, 6.35, 18.3]} color="#d5dae0" seg={24} extra={{ metal: 0.6 }} />
      <Box size={[12, 24.5, 8]} pos={[-18.5, 0, 21.5]} color="#1d2027" extra={{ rough: 0.5 }} />
      <Box size={[8, 18, 0.4]} pos={[-18.5, 0, 25.6]} color="#2b3038" />
    </group>
  );
}

/** Wall adapter: black body with its two blades behind and the cable to the plug in front. Origin at the centre of the body. */
export function Adapter() {
  return (
    <group>
      <Box size={[38, 26, 24]} color="#23272f" extra={{ rough: 0.5 }} />
      <Box size={[36, 24, 0.3]} pos={[0, 0, 12.1]} color="#2b3038" />
      <Box size={[22, 0.2, 9]} pos={[0, -13.1, 3]} color="#e8ecf2" />
      {[-6, 6].map((y) => (
        <Box key={y} size={[6, 1.4, 18]} pos={[22, y, 0]} color="#d5dae0" extra={{ metal: 0.6, rough: 0.3 }} />
      ))}
      <Cyl r={2.2} len={4} axis="x" pos={[-20.5, 0, -2]} color="#1d2027" seg={16} />
    </group>
  );
}

/** DC plug 5.5 x 2.1 mm: handle outside, metal barrel that goes into the jack. Origin at the shoulder, +x outward. */
export function Plug() {
  return (
    <group>
      <Cyl r={4.4} len={14} axis="x" pos={[7, 0, 0]} color="#1d2027" extra={{ rough: 0.45 }} />
      <Cyl r={4.9} len={1} axis="x" pos={[0.5, 0, 0]} color="#2a2f38" />
      <Cyl r={2.7} len={9.5} axis="x" pos={[-4.75, 0, 0]} color="#d5dae0" extra={{ metal: 0.6, rough: 0.3 }} />
      <Cyl r={1.1} len={9.5} axis="x" pos={[-4.75, 0, 0]} color="#0b0c10" seg={14} />
    </group>
  );
}

/** Heat-shrink over the first part of a wire. */
export function Sleeve({ points }: { points: V3[] }) {
  return <Tube points={points} r={1.2} color="#ffc400" extra={{ opacity: 0.55 }} round={2} />;
}

export function Solder({ pos }: { pos: V3 }) {
  return <Ball r={1.05} pos={pos} color="#cfd5dc" scale={[1, 1, 0.55]} extra={{ metal: 0.7, rough: 0.3 }} />;
}

export type { ReactNode };
