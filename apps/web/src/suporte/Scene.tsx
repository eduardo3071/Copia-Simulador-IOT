import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Color, DoubleSide, Group, Object3D, Plane, Quaternion, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { COVER_GLASS, d2Placement, DEFAULT_HOLDER_PARAMS, holderLayout, layoutEconomica1000x, padAt, PCB, wires as routeWires, wires1000x, type SuporteVersion } from "@simiot/adapter-cad";
import { MatContext, type Mat } from "./mat.ts";
import { Adapter, Battery, Ceramic, Diode, InnerTube, Led5, Objective, OuterTube, Pcb, Plug, Pot, PowerJack, Resistor, RockerSwitch, Screw, Sleeve, Solder, To220, Tube, type V3 } from "./parts3d.tsx";
import { ApertureWheel, DiodeInline, DriverModule, Heatsink, LedStar3W, Objective100 } from "./parts1000x.tsx";

type Vec3 = [number, number, number];

export const ASSETS = `${import.meta.env.BASE_URL}suporte/`;

/** Heights from the holder layout: ring top = underside of the pregoscopio head; the slide sits 40.4 mm above the box floor. */
export const HEAD_Z = 228.2;
export const SLIDE_Z = 40.4;
/** STEP V1: the lower end of the sleeve is 156.5 mm under the head; the objective hangs 35 mm below it. */
export const SLEEVE_DEPTH = 156.5;
export const OBJECTIVE_LENGTH = 35;
/** The inner tube is 41.5 mm out of the outer one at retract = 0 (the STEP value); the real tube pulls out 40 mm, so retract starts at 1.5. */
export const INNER_TUBE_REACH = 41.5;
/** Where the inner tube sits when the lens is 0.8 mm above the slide. */
export const NOMINAL_RETRACT = SLIDE_Z + 0.8 + OBJECTIVE_LENGTH - (HEAD_Z - SLEEVE_DEPTH);

const geometryCache = new Map<string, Promise<BufferGeometry>>();
function loadStl(url: string) {
  let pending = geometryCache.get(url);
  if (!pending) {
    pending = new STLLoader().loadAsync(url).then((g) => {
      const smooth = toCreasedNormals(g, 0.66);
      smooth.computeBoundingBox();
      return smooth;
    });
    geometryCache.set(url, pending);
  }
  return pending;
}
function useStl(url: string) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  useEffect(() => {
    let live = true;
    void loadStl(url).then((g) => live && setGeometry(g));
    return () => {
      live = false;
    };
  }, [url]);
  return geometry;
}

export interface SceneOptions {
  version: SuporteVersion;
  /** Economical 1000x version (v2 electronics, 100x objective, 3 W LED under a printed aperture wheel). */
  econ1000?: boolean;
  /** Which hole of the aperture wheel faces the optical axis (index into the wheel holes). */
  aperture?: number;
  explode: number;
  retract: number;
  cut: number;
  lightOn: boolean;
  selected: string | null;
  layers: Record<Layer, boolean>;
  /** Assembly steps: only these parts are drawn (null draws all), and `highlight` ones glow. */
  only?: Set<string> | null;
  highlight?: Set<string>;
  /** How far the lid and what rides on it are pulled away from the box; defaults to `explode`. */
  lidDrop?: number;
  /** Assembly arrows: from, to (the head is at `to`). */
  arrows?: { from: Vec3; to: Vec3 }[];
  onPick(id: string | null): void;
}
export type Layer = "impressa" | "pregoscopio" | "eletronica" | "parafusos" | "lamina" | "fios";

/** Registry the badges read: each part reports its object and the point its label hangs from. */
export type Registry = MutableRefObject<Map<string, { object: Object3D; local: Vector3 }>>;

/** False when the layer is off or the assembly step has not reached the part yet. */
function shown(options: SceneOptions, id: string, layer: Layer, needs?: string) {
  if (!options.layers[layer]) return false;
  if (options.only && (!options.only.has(id) || (needs && !options.only.has(needs)))) return false;
  return true;
}

/** 68 ohm 1 %: blue, grey, black, gold, brown. */
const R1_BANDS = ["#2a4fd6", "#8a8f98", "#111111", "#d4af37", "#7a4a21"];

/**
 * The end of a panel wire that is soldered to a part of the box stays with the box when the lid is pulled away: the wire
 * sags between the two, the way a service loop does.
 */
function dropped(path: Vec3[], drop: number): V3[] {
  if (drop <= 0) return path as V3[];
  const n = path.length;
  return path.map((p, i) => {
    const w = i < 2 ? 1 : Math.max(0, 1 - (i - 1) / (n - 2)) ** 1.6;
    return [p[0], p[1], p[2] + drop * w] as V3;
  });
}

/** First `length` mm of a polyline. */
function headOf(path: Vec3[], length: number): V3[] {
  const out: V3[] = [path[0]!];
  let left = length;
  for (let i = 0; i < path.length - 1 && left > 0; i++) {
    const a = new Vector3(...path[i]!);
    const b = new Vector3(...path[i + 1]!);
    const d = a.distanceTo(b);
    if (d >= left) {
      const p = a.lerp(b, left / d);
      out.push([p.x, p.y, p.z]);
      return out;
    }
    out.push(path[i + 1]!);
    left -= d;
  }
  return out;
}

const COLORS = {
  body: "#aab5c1", lid: "#7d8999", clamp: "#e8872b", diffuser: "#f3efe4",
  head: "#4a5463", tube: "#566073", inner: "#8b95a3", hook: "#3d4654", knob: "#2f3744", ring: "#c5ccd5", sleeve: "#69748a",
  metal: "#d5dae0", glass: "#8fd0ff", battery: "#3b4757", board: "#1f7a4f", dark: "#262c36", led: "#fff6df", screw: "#c9ced6", psu: "#2a2f38",
};

interface PartProps {
  id: string;
  layer: Layer;
  options: SceneOptions;
  registry: Registry;
  plane: Plane;
}

function materialProps(props: PartProps, color: string, extra: { opacity?: number; emissive?: string; metal?: number; rough?: number } = {}) {
  const { options, id, plane } = props;
  const selected = options.selected === id || (options.highlight?.has(id) ?? false);
  const clipping = options.cut > -50 ? [plane] : [];
  return {
    color,
    roughness: extra.rough ?? 0.58,
    metalness: extra.metal ?? 0.05,
    side: DoubleSide,
    clippingPlanes: clipping,
    transparent: (extra.opacity ?? 1) < 1,
    opacity: extra.opacity ?? 1,
    depthWrite: (extra.opacity ?? 1) >= 1,
    emissive: new Color(selected ? "#ff8a00" : extra.emissive ?? "#000000"),
    emissiveIntensity: selected ? 0.55 : extra.emissive ? 0.9 : 0,
  };
}

function useMaterialProps(props: PartProps, color: string, extra: { opacity?: number; emissive?: string } = {}) {
  return materialProps(props, color, extra);
}

/** A part made of several meshes (the models of parts3d): hidden until its assembly step, glows when highlighted, reports its label point. */
function PartGroup(props: PartProps & { position?: Vec3; rotation?: Vec3; label?: Vec3; needs?: string; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const { options, id, plane } = props;
  const mat = useMemo<Mat>(() => (color, extra) => materialProps(props, color, extra), [options.selected, options.highlight, options.cut, id, plane]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = props.label ? props.label.join(",") : "";
  useEffect(() => register(props, ref.current, new Vector3(...(props.label ?? [0, 0, 0]))), [id, label]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown(options, id, props.layer, props.needs)) return <group ref={ref} />;
  return (
    <MatContext.Provider value={mat}>
      <group ref={ref} position={props.position} rotation={props.rotation} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); options.onPick(id); }}>
        {props.children}
      </group>
    </MatContext.Provider>
  );
}

/** Where each label hangs, in the part's own frame, so labels do not pile up in the middle of the model. */
const LABEL_AT: Record<string, Vec3> = {
  M5: [24, 0, 20], AP1: [30, 0, 36],
  M1: [0, 60, 115], M2: [0, -21, 199], M3: [-38, -42, -1], M4: [13, 0, 38],
  P1: [-30, 0, 8], P4: [-60, 0, 34], P5: [60, 0, 34], P6: [79, 17, 10], P10: [-79, 17, 10],
};

function register(props: PartProps, object: Object3D | null, local = new Vector3()) {
  const at = LABEL_AT[props.id];
  if (object) props.registry.current.set(props.id, { object, local: at ? new Vector3(...at) : local });
}

/** A part loaded from an STL; its label hangs from the middle of its bounding box. */
function StlPart(props: PartProps & { url: string; color: string; opacity?: number; position?: Vec3 }) {
  const geometry = useStl(props.url);
  const ref = useRef<Group>(null);
  const material = useMaterialProps(props, props.color, { opacity: props.opacity });
  useEffect(() => {
    if (!geometry || !ref.current) return;
    const center = new Vector3();
    geometry.boundingBox?.getCenter(center);
    register(props, ref.current, center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);
  if (!geometry || !shown(props.options, props.id, props.layer)) return <group ref={ref} />;
  return (
    <group ref={ref} position={props.position}>
      <mesh geometry={geometry} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); props.options.onPick(props.id); }}>
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}

type Shape = { kind: "box"; size: Vec3 } | { kind: "cyl"; r: number; len: number; axis: "x" | "y" | "z" } | { kind: "dome" };

/** Simple primitive for the parts that have no CAD model (a switch, a resistor, a battery). */
function Primitive(props: PartProps & { shape: Shape; color: string; position: Vec3; opacity?: number; emissive?: string }) {
  const ref = useRef<Group>(null);
  const material = useMaterialProps(props, props.color, { opacity: props.opacity, emissive: props.emissive });
  useEffect(() => register(props, ref.current), [props.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const { shape } = props;
  const rotation: Vec3 = shape.kind === "cyl" ? (shape.axis === "z" ? [Math.PI / 2, 0, 0] : shape.axis === "x" ? [0, 0, Math.PI / 2] : [0, 0, 0]) : [0, 0, 0];
  if (!shown(props.options, props.id, props.layer)) return <group ref={ref} position={props.position} />;
  return (
    <group ref={ref} position={props.position}>
      <mesh rotation={rotation} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); props.options.onPick(props.id); }}>
        {shape.kind === "box" && <boxGeometry args={shape.size} />}
        {shape.kind === "cyl" && <cylinderGeometry args={[shape.r, shape.r, shape.len, 40]} />}
        {shape.kind === "dome" && <sphereGeometry args={[2.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />}
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}

/** A cylinder between two points: wires, legs and the pieces of a polyline. */
function Segment({ a, b, r, color, material }: { a: Vec3; b: Vec3; r: number; color: string; material: Record<string, unknown> }) {
  const from = new Vector3(...a);
  const to = new Vector3(...b);
  const length = from.distanceTo(to);
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
  const middle = from.clone().add(to).multiplyScalar(0.5);
  return (
    <mesh position={middle} quaternion={quaternion}>
      <cylinderGeometry args={[r, r, length, 12]} />
      <meshStandardMaterial {...material} color={color} />
    </mesh>
  );
}

/** An orange arrow that shows where a part goes in an assembly step. */
function ArrowGuide({ from, to, material }: { from: Vec3; to: Vec3; material: Record<string, unknown> }) {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const dir = b.clone().sub(a);
  const length = dir.length();
  const unit = dir.clone().normalize();
  const head = Math.min(9, length * 0.4);
  const neck = b.clone().sub(unit.clone().multiplyScalar(head));
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), unit);
  const middle = b.clone().sub(unit.clone().multiplyScalar(head / 2));
  return (
    <group>
      <Segment a={from} b={[neck.x, neck.y, neck.z]} r={1.6} color="#ff8a00" material={material} />
      <mesh position={middle} quaternion={quaternion}>
        <coneGeometry args={[4.2, head, 20]} />
        <meshStandardMaterial {...material} color="#ff8a00" />
      </mesh>
    </group>
  );
}

/** The bead of hot glue that holds the diffuser in its seat. */
function GlueRing(props: Omit<PartProps, "id" | "layer"> & { position: Vec3 }) {
  const ref = useRef<Group>(null);
  const full: PartProps = { ...props, id: "W3", layer: "fios" };
  const material = useMaterialProps(full, "#fff0b8", { opacity: 0.7 });
  useEffect(() => register(full, ref.current, new Vector3(13.2, 0, 0.4)), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown(props.options, "W3", "fios")) return <group ref={ref} />;
  return (
    <group ref={ref} position={props.position}>
      <mesh position={[0, 0, 0.4]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); props.options.onPick("W3"); }}>
        <torusGeometry args={[13.2, 0.55, 8, 56]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}

/** Where the inner tube sits when the 100x objective is at its working distance in the 1000x version. */
export function econRetract(): number {
  const l = layoutEconomica1000x();
  return Math.round((l.tube.sleeveBottom - l.totalHeight + SLEEVE_DEPTH) * 10) / 10;
}

/**
 * The economical 1000x version: v2 box with a taller column, the 100x/1.25 oil objective, a 3 W LED on a heatsink under an iris
 * inside a printed light tube, a driver module on a perforated board, a cover glass and a drop of oil. The dimensions are the ones of
 * `componentes1000x()`; the wires are not drawn.
 */
function Assembly1000({ options, registry }: { options: SceneOptions; registry: Registry }) {
  const { explode: e, retract } = options;
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  plane.constant = -options.cut;
  const layout = useMemo(() => layoutEconomica1000x(), []);
  const p = layout.params;
  const t = layout.lightTube!;
  const bd = layout.board;
  const bcx = (bd.xMin + bd.xMax) / 2;
  const bcy = (bd.yMin + bd.yMax) / 2;
  const mountHoles: [number, number][] = layout.boardPosts.map((q) => [q.x - bcx, q.y - bcy]);
  const base = { options, registry, plane };
  const stl = (name: string) => `${ASSETS}mecanica/${name}`;
  const pre = (n: number) => `${ASSETS}pregoscopio/pregoscopio-${n}.stl`;
  const lidZ = -(options.lidDrop ?? e);
  const headZ = layout.totalHeight + e * 1.5;
  const sample = layout.samplePlane - COVER_GLASS;
  const coverTop = sample + COVER_GLASS;
  const dir = "v2-1000x";
  const wires = useMemo(() => wires1000x(), []);
  const d2 = useMemo(() => d2Placement(), []);
  const dropZ = coverTop + (p.workingDistance - COVER_GLASS) / 2;

  return (
    <>
      <StlPart {...base} id="M1" layer="impressa" url={stl(`${dir}/suporte-base-coluna.stl`)} color={COLORS.body} />
      <StlPart {...base} id="M2" layer="impressa" url={stl(`${dir}/abracadeira-tubo.stl`)} color={COLORS.clamp} position={[0, -e * 0.9, 0]} />
      <StlPart {...base} id="M4" layer="impressa" url={stl("comum/difusor.stl")} color={COLORS.diffuser} opacity={0.8} position={[0, 0, 37.8 + e * 0.8]} />
      <GlueRing {...base} position={[0, 0, 37.8 + e * 0.8]} />
      {options.arrows?.map((arrow, i) => (
        <ArrowGuide key={i} from={arrow.from} to={arrow.to} material={{ roughness: 0.5, metalness: 0, emissive: new Color("#ff8a00"), emissiveIntensity: 0.25, clippingPlanes: [] }} />
      ))}

      {/* aperture wheel on the pin of the light tube, just under the diffuser; its edge comes out of the right wall */}
      <PartGroup {...base} id="AP1" layer="impressa" position={[t.wheel.pivotX + e * 0.4, 0, t.wheel.bottom + e * 0.5]} rotation={[0, 0, Math.PI - t.wheel.holes[Math.min(options.aperture ?? 0, t.wheel.holes.length - 1)]!.angle]} label={[t.wheel.radius - 3, 0, 1]}>
        <ApertureWheel radius={t.wheel.radius} thickness={t.wheel.thickness} pinHole={t.wheel.pinHole} holes={t.wheel.holes} />
      </PartGroup>

      {/* everything that rides on the lid */}
      <group position={[0, 0, lidZ]}>
        <StlPart {...base} id="M3" layer="impressa" url={stl(`${dir}/tampa-fundo.stl`)} color={COLORS.lid} />
        <StlPart {...base} id="M5" layer="impressa" url={stl(`${dir}/tubo-de-luz.stl`)} color="#2c3138" />
        <PartGroup {...base} id="HS1" layer="eletronica" position={[0, 0, 0]} label={[16, 0, 6]}>
          <Heatsink diameter={p.heatsinkDiameter} height={p.heatsinkHeight} />
        </PartGroup>
        <PartGroup {...base} id="D1" layer="eletronica" position={[0, 0, p.heatsinkHeight]} label={[0, 0, 7]}>
          <LedStar3W diameter={p.ledStarDiameter} thickness={p.ledStarThickness} lit={options.lightOn} />
        </PartGroup>
        <PartGroup {...base} id="PCB1" layer="eletronica" position={[bcx, bcy, bd.standoffHeight]} label={[bd.xMax - bcx - 4, bd.yMax - bcy - 3, 1.6]}>
          <Pcb width={bd.xMax - bd.xMin} height={bd.yMax - bd.yMin} pads={[]} holes={mountHoles} traces={[]} />
        </PartGroup>
        <PartGroup {...base} id="DR1" layer="eletronica" position={[bcx, bcy, bd.standoffHeight + 1.6]} label={[0, 0, 11]}>
          <DriverModule size={[30, 20, 10]} />
        </PartGroup>
        {/* the wires of the 1000x version, routed around the parts; the three that start on a part of the wall follow the box when the lid is pulled away */}
        {wires.map((w) => (
          <PartGroup key={w.spec.id} {...base} id="W1" layer="fios" needs={w.spec.panel ? "PCB1" : "D1"} label={w.path[Math.min(4, w.path.length - 1)]!}>
            <Tube points={w.spec.panel ? dropped(w.path, -lidZ) : (w.path as V3[])} r={0.62} color={w.spec.color} round={3.2} />
            <Solder pos={w.spec.panel ? [w.from[0], w.from[1], w.from[2] - lidZ] : [w.from[0], w.from[1], w.from[2]]} />
            <Solder pos={[w.to[0], w.to[1], w.to[2]]} />
          </PartGroup>
        ))}
        {layout.boardPosts.map((q, i) => (
          <PartGroup key={i} {...base} id="H3" layer="parafusos" position={[q.x, q.y, bd.standoffHeight + 1.6]} label={[0, 0, 2]}>
            <Screw r={2.8} />
          </PartGroup>
        ))}
        {layout.lid.holes.map((q, i) => (
          <PartGroup key={i} {...base} id="H1" layer="parafusos" position={[q.x, q.y, -p.wall]} rotation={[Math.PI, 0, 0]} label={[0, 0, 2]}>
            <Screw r={2.8} />
          </PartGroup>
        ))}
      </group>

      {/* on the box wall */}
      <PartGroup {...base} id="SW1" layer="eletronica" position={[p.switchCutout.x, layout.box.yMin - e * 0.3, 20]} label={[0, -4, 0]}>
        <RockerSwitch />
      </PartGroup>
      <PartGroup {...base} id="J1" layer="eletronica" position={[layout.box.xMax + e * 0.3, p.jackY, 20]} rotation={[0, 0, Math.PI / 2]} label={[0, -2, 4]}>
        <PowerJack />
      </PartGroup>
      {/* D2: anode soldered to the + lug of the jack, body in the air along +y, cathode wire to the switch */}
      <PartGroup {...base} id="D2" layer="eletronica" position={[d2.anode[0] + e * 0.3, d2.anode[1], d2.anode[2]]} label={[0, 7, 3]}>
        <DiodeInline length={d2.cathode[1] - d2.anode[1]} />
      </PartGroup>
      <PartGroup {...base} id="PS1" layer="eletronica" position={[0, 0, 0]} label={[90 + e * 0.3, 0, 28]}>
        <group position={[90 + e * 0.3, 0, 14]}><Adapter /></group>
        <group position={[layout.box.xMax + e * 0.3, p.jackY, 20]}><Plug /></group>
        <Tube points={[[layout.box.xMax + 14 + e * 0.3, 0, 20], [layout.box.xMax + 19 + e * 0.3, 0, 20.5], [layout.box.xMax + 22 + e * 0.3, 0, 16], [layout.box.xMax + 24 + e * 0.3, 0, 12.2]]} r={1.6} color="#14171c" />
      </PartGroup>

      {/* slide, cover glass and the drop of oil between the cover glass and the objective */}
      <Primitive {...base} id="L1" layer="lamina" shape={{ kind: "box", size: [76, 26, 1] }} color={COLORS.glass} opacity={0.4} position={[0, 0, sample - 0.5 + e * 1.1]} />
      <Primitive {...base} id="CV1" layer="lamina" shape={{ kind: "box", size: [22, 22, COVER_GLASS] }} color="#dff3ff" opacity={0.6} position={[0, 0, sample + COVER_GLASS / 2 + e * 1.1]} />
      <Primitive {...base} id="OIL" layer="lamina" shape={{ kind: "cyl", r: 2.5, len: Math.max(p.workingDistance - COVER_GLASS, 0.1), axis: "z" }} color="#9fe4ff" opacity={0.75} position={[0, 0, dropZ + e * 1.1]} />
      {[-24.4, 24.4].map((x) => (
        <PartGroup key={x} {...base} id="H2" layer="parafusos" position={[x, -12.8 - e * 0.9, (layout.ring.bottom + layout.ring.top) / 2]} rotation={[Math.PI / 2, 0, 0]} label={[0, 0, 2]}>
          <Screw r={2.8} />
        </PartGroup>
      ))}

      {/* the pregoscopio, from the STEP, with the 100x objective on the inner tube */}
      <group position={[0, 0, headZ]}>
        <StlPart {...base} id="P1" layer="pregoscopio" url={pre(1)} color={COLORS.head} />
        <PartGroup {...base} id="P2" layer="pregoscopio" label={[0, -17, -70]}>
          <OuterTube diameter={p.tubeDiameter} length={p.tubeLength} />
        </PartGroup>
        <StlPart {...base} id="P4" layer="pregoscopio" url={pre(4)} color={COLORS.hook} />
        <StlPart {...base} id="P5" layer="pregoscopio" url={pre(5)} color={COLORS.hook} />
        <StlPart {...base} id="P6" layer="pregoscopio" url={pre(6)} color={COLORS.knob} />
        <StlPart {...base} id="P10" layer="pregoscopio" url={pre(9)} color={COLORS.knob} />
        <group position={[0, 0, retract]}>
          <PartGroup {...base} id="P3" layer="pregoscopio" position={[0, 0, -SLEEVE_DEPTH]} label={[0, -12, 6]}>
            <InnerTube diameter={p.sleeveDiameter} length={80} reach={40} />
          </PartGroup>
          <PartGroup {...base} id="P9" layer="pregoscopio" position={[0, 0, -SLEEVE_DEPTH - p.objectiveLength]} label={[0, -10, 18]}>
            <Objective100 length={p.objectiveLength} radius={p.objectiveDiameter / 2} />
          </PartGroup>
        </group>
      </group>
    </>
  );
}

function Assembly({ options, registry }: { options: SceneOptions; registry: Registry }) {
  if (options.econ1000) return <Assembly1000 options={options} registry={registry} />;
  return <AssemblyClassic options={options} registry={registry} />;
}

function AssemblyClassic({ options, registry }: { options: SceneOptions; registry: Registry }) {
  const { version, explode: e, retract } = options;
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  plane.constant = -options.cut;
  const v = version === "v1" ? "v1-pilha" : "v2-fonte";
  const layout = useMemo(() => holderLayout({ ...DEFAULT_HOLDER_PARAMS, variant: version === "v1" ? "pilha" : "fonte" }), [version]);
  const routes = useMemo(() => routeWires(version), [version]);
  const pcb = PCB[version];
  const bd = layout.board;
  const bcx = (bd.xMin + bd.xMax) / 2;
  const bcy = (bd.yMin + bd.yMax) / 2;
  const bw = pcb.width;
  const bh = pcb.height;
  const bTop = bd.standoffHeight + 1.6;
  const led = layout.ledPost;
  const uOut = padAt(version, "U1.OUT");
  const between = (a: string, b: string) => {
    const p = padAt(version, a);
    const q = padAt(version, b);
    return { mid: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as [number, number], angle: Math.atan2(q[1] - p[1], q[0] - p[0]), span: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  };
  const r1 = between("R1.pin1", "R1.pin2");
  const c1 = between("C1.pin1", "C1.pin2");
  const d2 = version === "v2" ? between("D2.pin1", "D2.pin2") : null;
  const mountHoles: [number, number][] = layout.boardPosts.map((q) => [q.x - bcx, q.y - bcy]);
  const base = { options, registry, plane };
  const stl = (name: string) => `${ASSETS}mecanica/${name}`;
  const pre = (n: number) => `${ASSETS}pregoscopio/pregoscopio-${n}.stl`;
  const lidZ = -(options.lidDrop ?? e);
  const headZ = HEAD_Z + e * 1.5;

  return (
    <>
      {/* printed */}
      <StlPart {...base} id="M1" layer="impressa" url={stl(`${v}/suporte-base-coluna.stl`)} color={COLORS.body} />
      <StlPart {...base} id="M2" layer="impressa" url={stl("comum/abracadeira-tubo.stl")} color={COLORS.clamp} position={[0, -e * 0.9, 0]} />
      <StlPart {...base} id="M4" layer="impressa" url={stl("comum/difusor.stl")} color={COLORS.diffuser} opacity={0.8} position={[0, 0, 37.8 + e * 0.8]} />
      <GlueRing {...base} position={[0, 0, 37.8 + e * 0.8]} />
      {options.arrows?.map((arrow, i) => (
        <ArrowGuide key={i} from={arrow.from} to={arrow.to} material={{ roughness: 0.5, metalness: 0, emissive: new Color("#ff8a00"), emissiveIntensity: 0.25, clippingPlanes: [] }} />
      ))}

      {/* everything that rides on the lid */}
      <group position={[0, 0, lidZ]}>
        <StlPart {...base} id="M3" layer="impressa" url={stl(`${v}/tampa-fundo.stl`)} color={COLORS.lid} />
        <PartGroup {...base} id="D1" layer="eletronica" position={[0, 0, led.top - led.seatDepth]} label={[0, 0, 9]}>
          <Led5 lit={options.lightOn} />
        </PartGroup>
        {/* the driver board on its four standoffs, with the real pads and traces of the Gerber files */}
        <PartGroup {...base} id="PCB1" layer="eletronica" position={[bcx, bcy, bd.standoffHeight]} label={[bw / 2 - 4, bh / 2 - 3, 1.6]}>
          <Pcb width={bw} height={bh} pads={Object.values(pcb.pads)} holes={mountHoles} traces={pcb.traces} />
          {Object.values(pcb.pads).map((p, i) => <Solder key={i} pos={[p[0], p[1], 1.9]} />)}
        </PartGroup>
        <PartGroup {...base} id="U1" layer="eletronica" position={[uOut[0], uOut[1], bTop]} label={[0, 0, 22]}>
          <To220 pitch={Math.abs(padAt(version, "U1.IN")[0] - uOut[0])} />
        </PartGroup>
        <PartGroup {...base} id="R1" layer="eletronica" position={[r1.mid[0], r1.mid[1], bTop]} rotation={[0, 0, r1.angle]} label={[0, 0, 4]}>
          <Resistor span={r1.span} bands={R1_BANDS} />
        </PartGroup>
        <PartGroup {...base} id="C1" layer="eletronica" position={[c1.mid[0], c1.mid[1], bTop]} rotation={[0, 0, c1.angle]} label={[0, 0, 8]}>
          <Ceramic span={c1.span} />
        </PartGroup>
        {d2 && (
          <PartGroup {...base} id="D2" layer="eletronica" position={[d2.mid[0], d2.mid[1], bTop]} rotation={[0, 0, d2.angle]} label={[0, 0, 4]}>
            <Diode span={d2.span} />
          </PartGroup>
        )}
        {version === "v1" && (
          <PartGroup {...base} id="BT1" layer="eletronica" position={[0, layout.params.batteryY, 0]} label={[10, 0, 18]}>
            <Battery />
          </PartGroup>
        )}
        {/* wires, routed around the parts; the LED pair carries heat-shrink where it leaves the post */}
        {routes.map((w, i) => (
          <PartGroup key={w.id} {...base} id="W1" layer="fios" needs={w.spec.part === "D1" ? "D1" : "PCB1"} label={w.path[Math.min(3, w.path.length - 1)]!}>
            <Tube points={w.spec.part === "D1" || w.spec.part === "BT1" ? (w.path as V3[]) : dropped(w.path, -lidZ)} r={0.62} color={w.spec.color} round={3.2} />
            <Solder pos={w.spec.part === "D1" || w.spec.part === "BT1" ? [w.from[0], w.from[1], w.from[2]] : [w.from[0], w.from[1], w.from[2] - lidZ]} />
          </PartGroup>
        ))}
        {routes.filter((w) => w.spec.part === "D1").map((w) => (
          <PartGroup key={`s${w.id}`} {...base} id="W2" layer="fios" needs="D1" label={w.path[2]!}>
            <Sleeve points={headOf(w.path, 11)} />
          </PartGroup>
        ))}
        {layout.boardPosts.map((q, i) => (
          <PartGroup key={i} {...base} id="H3" layer="parafusos" position={[q.x, q.y, bTop]} label={[0, 0, 2]}>
            <Screw r={2.8} />
          </PartGroup>
        ))}
        {layout.lid.holes.map((q, i) => (
          <PartGroup key={i} {...base} id="H1" layer="parafusos" position={[q.x, q.y, -layout.params.wall]} rotation={[Math.PI, 0, 0]} label={[0, 0, 2]}>
            <Screw r={2.8} />
          </PartGroup>
        ))}
      </group>

      {/* on the box wall */}
      <PartGroup {...base} id="SW1" layer="eletronica" position={[layout.params.switchCutout.x, layout.box.yMin - e * 0.3, 20]} label={[0, -4, 0]}>
        <RockerSwitch />
      </PartGroup>
      {version === "v2" && (
        <>
          <PartGroup {...base} id="J1" layer="eletronica" position={[layout.box.xMax + e * 0.3, layout.params.jackY, 20]} rotation={[0, 0, Math.PI / 2]} label={[0, -2, 4]}>
            <PowerJack />
          </PartGroup>
          <PartGroup {...base} id="RV1" layer="eletronica" position={[layout.params.knobX, layout.box.yMin - e * 0.3, 20]} label={[0, -8, 0]}>
            <Pot />
          </PartGroup>
          <PartGroup {...base} id="PS1" layer="eletronica" position={[0, 0, 0]} label={[90 + e * 0.3, 0, 28]}>
            <group position={[90 + e * 0.3, 0, 14]}><Adapter /></group>
            <group position={[layout.box.xMax + e * 0.3, layout.params.jackY, 20]}><Plug /></group>
            <Tube points={[[layout.box.xMax + 14 + e * 0.3, 0, 20], [layout.box.xMax + 19 + e * 0.3, 0, 20.5], [layout.box.xMax + 22 + e * 0.3, 0, 16], [layout.box.xMax + 24 + e * 0.3, 0, 12.2]]} r={1.6} color="#14171c" />
          </PartGroup>
        </>
      )}
      <Primitive {...base} id="L1" layer="lamina" shape={{ kind: "box", size: [76, 26, 1] }} color={COLORS.glass} opacity={0.4} position={[0, 0, 39.9 + e * 1.1]} />
      {[-24.4, 24.4].map((x) => (
        <PartGroup key={x} {...base} id="H2" layer="parafusos" position={[x, -12.8 - e * 0.9, 217.2]} rotation={[Math.PI / 2, 0, 0]} label={[0, 0, 2]}>
          <Screw r={2.8} />
        </PartGroup>
      ))}

      {/* the pregoscopio, from the STEP; the moving group is the inner tube with its ring and sleeve */}
      <group position={[0, 0, headZ]}>
        <StlPart {...base} id="P1" layer="pregoscopio" url={pre(1)} color={COLORS.head} />
        <PartGroup {...base} id="P2" layer="pregoscopio" label={[0, -17, -70]}>
          <OuterTube diameter={layout.params.tubeDiameter} length={layout.params.tubeLength} />
        </PartGroup>
        <StlPart {...base} id="P4" layer="pregoscopio" url={pre(4)} color={COLORS.hook} />
        <StlPart {...base} id="P5" layer="pregoscopio" url={pre(5)} color={COLORS.hook} />
        <StlPart {...base} id="P6" layer="pregoscopio" url={pre(6)} color={COLORS.knob} />
        <StlPart {...base} id="P10" layer="pregoscopio" url={pre(9)} color={COLORS.knob} />
        {/* the inner tube slides in the outer one; the objective screws on its lower end */}
        <group position={[0, 0, retract]}>
          <PartGroup {...base} id="P3" layer="pregoscopio" position={[0, 0, -SLEEVE_DEPTH]} label={[0, -12, 6]}>
            <InnerTube diameter={layout.params.sleeveDiameter} length={80} reach={40} />
          </PartGroup>
          <PartGroup {...base} id="P9" layer="pregoscopio" position={[0, 0, -SLEEVE_DEPTH - OBJECTIVE_LENGTH]} label={[0, -10, 18]}>
            <Objective />
          </PartGroup>
        </group>
      </group>
    </>
  );
}

/** A camera that frames a sphere from a direction: used by the assembly steps so each picture fills the frame. */
export interface Fit {
  center: Vec3;
  radius: number;
  dir: Vec3;
}
export interface SceneView {
  name: string;
  n: number;
  fit?: Fit;
}

function Controls({ target, view }: { target: Vec3; view: SceneView }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.target.set(...target);
    c.update();
    const redraw = () => invalidate();
    c.addEventListener("change", redraw);
    controls.current = c;
    invalidate();
    return () => {
      c.removeEventListener("change", redraw);
      c.dispose();
    };
  }, [camera, gl, invalidate, target]);
  useEffect(() => {
    if (view.fit && controls.current) {
      const { center, radius, dir } = view.fit;
      const distance = (radius / Math.sin((32 / 2) * (Math.PI / 180))) * 1.08;
      const d = new Vector3(...dir).normalize().multiplyScalar(distance);
      camera.position.set(center[0] + d.x, center[1] + d.y, center[2] + d.z);
      controls.current.target.set(...center);
      controls.current.update();
      invalidate();
      return;
    }
    const presets: Record<string, Vec3> = { iso: [340, -420, 330], front: [0, -740, 125], side: [740, 0, 125], top: [0, -80, 780], inside: [80, -250, 120], lid: [200, -230, 30] };
    const p = presets[view.name];
    if (!p || !controls.current) return;
    camera.position.set(...p);
    controls.current.target.set(0, view.name === "top" ? 20 : 0, view.name === "inside" ? 22 : view.name === "lid" ? -22 : 118);
    controls.current.update();
    invalidate();
  }, [view, camera, invalidate]);
  return null;
}

/** Pushes overlapping labels apart (screen space, a few passes) so every ID stays readable. */
export function spreadLabels(labels: { x: number; y: number }[], width = 34, height = 19) {
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i]!;
        const b = labels[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.abs(dx) >= width || Math.abs(dy) >= height) continue;
        // separate along the axis with the smaller overlap; a tie goes vertical
        const overlapX = width - Math.abs(dx);
        const overlapY = height - Math.abs(dy);
        if (overlapY <= overlapX) {
          const push = overlapY / 2 + 0.5;
          const dir = dy >= 0 ? 1 : -1;
          a.y -= dir * push;
          b.y += dir * push;
        } else {
          const push = overlapX / 2 + 0.5;
          const dir = dx >= 0 ? 1 : -1;
          a.x -= dir * push;
          b.x += dir * push;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/** Moves the ID labels over the canvas after each frame. */
function Projector({ registry, nodes, cut }: { registry: Registry; nodes: MutableRefObject<Map<string, HTMLElement>>; cut: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const point = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const labels: { id: string; node: HTMLElement; x: number; y: number }[] = [];
    for (const [id, entry] of [...registry.current].sort(([a], [b]) => a.localeCompare(b))) {
      const node = nodes.current.get(id);
      if (!node) continue;
      point.copy(entry.local);
      entry.object.localToWorld(point);
      // a label whose part the section plane removed would float in empty space
      const clipped = cut > -50 && point.y < cut;
      point.project(camera);
      const visible = !clipped && point.z < 1 && entry.object.visible && entry.object.children.length > 0;
      node.style.display = visible ? "" : "none";
      if (visible) labels.push({ id, node, x: (point.x * 0.5 + 0.5) * size.width, y: (-point.y * 0.5 + 0.5) * size.height });
    }
    spreadLabels(labels);
    for (const l of labels) l.node.style.transform = `translate(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px) translate(-50%, -50%)`;
  });
  return null;
}

export function SuporteScene({ options, ids, view, hint = true, paper = false, qty }: { options: SceneOptions; ids: string[]; view: SceneView; hint?: boolean; paper?: boolean; qty?: Record<string, number> }) {
  const registry: Registry = useRef(new Map());
  const nodes = useRef(new Map<string, HTMLElement>());
  const target = useMemo<Vec3>(() => [0, 0, 118], []);
  const key = `${options.version}${options.econ1000 ? "-1000x" : ""}`;
  const { onPick } = options;
  return (
    <div className={`suporte-stage${paper ? " paper" : ""}`}>
      <Canvas
        frameloop="demand"
        key={key}
        camera={{ position: [340, -420, 330], up: [0, 0, 1], fov: 32, near: 5, far: 4000 }}
        onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
        onPointerMissed={() => onPick(null)}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[300, -400, 500]} intensity={1.7} />
        <directionalLight position={[-300, 300, 200]} intensity={0.5} />
        {options.lightOn && <pointLight position={[0, 0, (options.econ1000 ? 30 : 33) - options.explode]} intensity={options.econ1000 ? 1400 : 900} distance={120} color="#ffe0a0" />}
        <Assembly options={options} registry={registry} />
        <Controls target={target} view={view} />
        <Projector registry={registry} nodes={nodes} cut={options.cut} />
      </Canvas>
      <div className="suporte-badges" aria-hidden={false}>
        {ids.map((id) => (
          <button
            key={id}
            className={`badge-id ${options.selected === id ? "on" : ""}`}
            ref={(node) => { if (node) nodes.current.set(id, node); else nodes.current.delete(id); }}
            onClick={() => onPick(id)}
            title={id}
          >
            {qty && (qty[id] ?? 1) > 1 ? `${id} ×${qty[id]}` : id}
          </button>
        ))}
      </div>
      {hint && <span className="suporte-hint">arrastar: girar · rolar: zoom · botão direito: mover · clique numa peça ou ID para selecionar</span>}
    </div>
  );
}

/** Top view of one calibration jig. */
export function JigPreview({ file }: { file: string }) {
  const geometry = useStl(`${ASSETS}mecanica/calibracao/${file}`);
  const center = useMemo(() => (geometry?.boundingBox ? geometry.boundingBox.getCenter(new Vector3()) : new Vector3()), [geometry]);
  const size = useMemo(() => (geometry?.boundingBox ? geometry.boundingBox.getSize(new Vector3()) : new Vector3(100, 100, 3)), [geometry]);
  const dist = Math.max(size.x / 1.1, size.y * 1.4);
  return (
    <div className="suporte-jig">
      <Canvas frameloop="demand" camera={{ position: [center.x, center.y - 0.01, dist * 1.6], up: [0, 1, 0], fov: 32, near: 1, far: 4000 }} key={file}>
        <ambientLight intensity={1} />
        <directionalLight position={[100, -200, 400]} intensity={1.6} />
        {geometry && (
          <mesh geometry={geometry}>
            <meshStandardMaterial color="#c8d0da" roughness={0.6} />
          </mesh>
        )}
        <JigControls target={[center.x, center.y, 0]} />
      </Canvas>
    </div>
  );
}

function JigControls({ target }: { target: Vec3 }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.target.set(...target);
    c.update();
    c.addEventListener("change", () => invalidate());
    invalidate();
    return () => c.dispose();
  }, [camera, gl, invalidate, target]);
  return null;
}

