import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Color, DoubleSide, Group, Object3D, Plane, Quaternion, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SuporteVersion } from "@simiot/adapter-cad";

type Vec3 = [number, number, number];

export const ASSETS = `${import.meta.env.BASE_URL}suporte/`;

/** Heights from the holder layout: ring top = underside of the pregoscopio head; the slide sits 40.4 mm above the box floor. */
export const HEAD_Z = 210.2;
export const SLIDE_Z = 40.4;
/** STEP V1: the lower end of the sleeve is 156.5 mm under the head; the objective hangs 35 mm below it. */
export const SLEEVE_DEPTH = 156.5;
export const OBJECTIVE_LENGTH = 35;
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
  explode: number;
  retract: number;
  cut: number;
  lightOn: boolean;
  selected: string | null;
  layers: Record<Layer, boolean>;
  onPick(id: string | null): void;
}
export type Layer = "impressa" | "pregoscopio" | "eletronica" | "parafusos" | "lamina" | "fios";

/** Registry the badges read: each part reports its object and the point its label hangs from. */
export type Registry = MutableRefObject<Map<string, { object: Object3D; local: Vector3 }>>;

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

function useMaterialProps(props: PartProps, color: string, extra: { opacity?: number; emissive?: string } = {}) {
  const { options, id, plane } = props;
  const selected = options.selected === id;
  const clipping = options.cut > -50 ? [plane] : [];
  return {
    color,
    roughness: 0.58,
    metalness: 0.05,
    side: DoubleSide,
    clippingPlanes: clipping,
    transparent: (extra.opacity ?? 1) < 1,
    opacity: extra.opacity ?? 1,
    depthWrite: (extra.opacity ?? 1) >= 1,
    emissive: new Color(selected ? "#ff8a00" : extra.emissive ?? "#000000"),
    emissiveIntensity: selected ? 0.55 : extra.emissive ? 0.9 : 0,
  };
}

/** Where each label hangs, in the part's own frame, so labels do not pile up in the middle of the model. */
const LABEL_AT: Record<string, Vec3> = {
  M1: [0, 60, 115], M2: [0, -21, 199], M3: [-38, -42, -1], M4: [13, 0, 38],
  P1: [-30, 0, 8], P2: [0, -15, -70], P3: [0, -11.7, -140], P4: [-60, 0, 34], P5: [60, 0, 34], P6: [79, 17, 10], P10: [-79, 17, 10], P7: [13.7, 0, -145], P8: [18, 0, -148],
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
  if (!geometry || !props.options.layers[props.layer]) return <group ref={ref} />;
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
  if (!props.options.layers[props.layer]) return <group ref={ref} position={props.position} />;
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

type WireDef = { points: Vec3[]; color: string };

/** Wires of each version in the lid's frame: the LED pair first (they carry the heat-shrink), then the rest. */
function wiring(version: SuporteVersion, board: { w: number; x: number; y: number }): WireDef[] {
  const top = 7.9; // board surface plus a pad
  if (version === "v1") {
    const near = board.y + 8;
    return [
      { color: "#ff8a1f", points: [[0.9, -5.5, 3], [0.9, -11, 3], [board.x + 8, near, top]] },
      { color: "#222222", points: [[-0.9, -5.5, 3], [-0.9, -11, 3], [board.x + 10, near, top]] },
      // battery clip: red and black leads to the board
      { color: "#d92d20", points: [[-18, 38, 17.5], [-16, 12, 13], [board.x - 14, board.y + 11, top]] },
      { color: "#222222", points: [[-12, 38, 17.5], [-10, 14, 13], [board.x - 11, board.y + 11, top]] },
      // switch terminals
      { color: "#d92d20", points: [[-30, -40, 17], [-24, -34, 12], [board.x - 14, board.y - 8, top]] },
      { color: "#ff8a1f", points: [[-20, -40, 17], [-16, -34, 12], [board.x - 11, board.y - 8, top]] },
    ];
  }
  const near = board.y - 10;
  return [
    { color: "#ff8a1f", points: [[0.9, 5.5, 3], [0.9, 11, 3], [-4, near, top]] },
    { color: "#222222", points: [[-0.9, 5.5, 3], [-0.9, 11, 3], [-2, near, top]] },
    // panel jack
    { color: "#d92d20", points: [[38, 2, 20], [34, 14, 14], [board.x - 30, board.y - 9, top]] },
    { color: "#222222", points: [[38, -2, 20], [35, 12, 14], [board.x - 28, board.y - 9, top]] },
    // switch
    { color: "#d92d20", points: [[-30, -40, 17], [-38, 0, 14], [board.x - 33, board.y - 6, top]] },
    { color: "#ff8a1f", points: [[-20, -40, 17], [-30, 0, 14], [board.x - 31, board.y - 3, top]] },
    // rheostat, three terminals
    { color: "#e0c200", points: [[19, -40, 18], [18, 4, 12], [board.x + 5, board.y - 10, top]] },
    { color: "#2e9e4f", points: [[25, -40, 18], [22, 4, 12], [board.x + 8, board.y - 10, top]] },
    { color: "#2f6fdb", points: [[31, -40, 18], [26, 4, 12], [board.x + 11, board.y - 10, top]] },
  ];
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

/** A wire (or a sleeve over one) along a polyline; the label hangs from the middle of the first segment. */
function Wire(props: PartProps & { points: Vec3[]; color: string; r?: number; opacity?: number; label?: boolean }) {
  const ref = useRef<Group>(null);
  const material = useMaterialProps(props, props.color, { opacity: props.opacity });
  useEffect(() => {
    if (props.label) register(props, ref.current, new Vector3(...props.points[0]!).add(new Vector3(...props.points[1]!)).multiplyScalar(0.5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, props.label]);
  if (!props.options.layers[props.layer]) return <group ref={ref} />;
  return (
    <group ref={ref} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); props.options.onPick(props.id); }}>
      {props.points.slice(0, -1).map((p, i) => (
        <Segment key={i} a={p} b={props.points[i + 1]!} r={props.r ?? 0.7} color={props.color} material={material} />
      ))}
    </group>
  );
}

/** The bead of hot glue that holds the diffuser in its seat. */
function GlueRing(props: Omit<PartProps, "id" | "layer"> & { position: Vec3 }) {
  const ref = useRef<Group>(null);
  const full: PartProps = { ...props, id: "W3", layer: "fios" };
  const material = useMaterialProps(full, "#fff0b8", { opacity: 0.7 });
  useEffect(() => register(full, ref.current, new Vector3(13.2, 0, 0.4)), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!props.options.layers.fios) return <group ref={ref} />;
  return (
    <group ref={ref} position={props.position}>
      <mesh position={[0, 0, 0.4]} onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); props.options.onPick("W3"); }}>
        <torusGeometry args={[13.2, 0.55, 8, 56]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}

function Assembly({ options, registry }: { options: SceneOptions; registry: Registry }) {
  const { version, explode: e, retract } = options;
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  plane.constant = -options.cut;
  const v = version === "v1" ? "v1-pilha" : "v2-fonte";
  const board = version === "v1" ? { w: 40, x: 8, y: -19 } : { w: 70, x: 0, y: 38 };
  const wires = wiring(version, board);
  const base = { options, registry, plane };
  const stl = (name: string) => `${ASSETS}mecanica/${name}`;
  const pre = (n: number) => `${ASSETS}pregoscopio/pregoscopio-${n}.stl`;
  const lidZ = -e;
  const headZ = HEAD_Z + e * 1.5;
  const collarBottom = -SLEEVE_DEPTH + retract;

  return (
    <>
      {/* printed */}
      <StlPart {...base} id="M1" layer="impressa" url={stl(`${v}/suporte-base-coluna.stl`)} color={COLORS.body} />
      <StlPart {...base} id="M2" layer="impressa" url={stl("comum/abracadeira-tubo.stl")} color={COLORS.clamp} position={[0, -e * 0.9, 0]} />
      <StlPart {...base} id="M4" layer="impressa" url={stl("comum/difusor.stl")} color={COLORS.diffuser} opacity={0.8} position={[0, 0, 37.8 + e * 0.8]} />
      <GlueRing {...base} position={[0, 0, 37.8 + e * 0.8]} />

      {/* everything that rides on the lid */}
      <group position={[0, 0, lidZ]}>
        <StlPart {...base} id="M3" layer="impressa" url={stl(`${v}/tampa-fundo.stl`)} color={COLORS.lid} />
        <Primitive {...base} id="D1" layer="eletronica" shape={{ kind: "cyl", r: 2.5, len: 4.5, axis: "z" }} color={COLORS.led} emissive={options.lightOn ? "#ffd27a" : undefined} position={[0, 0, 30.85]} />
        <Primitive {...base} id="D1" layer="eletronica" shape={{ kind: "dome" }} color={COLORS.led} emissive={options.lightOn ? "#ffd27a" : undefined} position={[0, 0, 33.1]} />
        {/* wires of the electronics, from each part to the driver board; the LED ones leave by the slot at the foot of its post */}
        {wires.map((w, i) => (
          <Wire key={i} {...base} id="W1" layer="fios" points={w.points} color={w.color} label={i === 0} />
        ))}
        {/* heat-shrink over the two LED wires, and the glue ring that holds the diffuser */}
        {wires.slice(0, 2).map((w, i) => (
          <Wire key={`sleeve${i}`} {...base} id="W2" layer="fios" points={[w.points[0]!, w.points[1]!]} color="#ffc400" r={1.3} opacity={0.55} label={i === 0} />
        ))}
        {version === "v1" && (
          <>
          <Primitive {...base} id="BT1" layer="eletronica" shape={{ kind: "cyl", r: 3.2, len: 1.6, axis: "z" }} color="#c5ccd5" position={[-18, 38, 18.3]} />
          <Primitive {...base} id="BT1" layer="eletronica" shape={{ kind: "cyl", r: 3.2, len: 1.6, axis: "z" }} color="#c5ccd5" position={[-12, 38, 18.3]} />
          <Primitive {...base} id="BT1" layer="eletronica" shape={{ kind: "box", size: [14, 9, 5] }} color="#1d2027" position={[-15, 38, 21.3]} />
          <Primitive {...base} id="BT1" layer="eletronica" shape={{ kind: "box", size: [48.5, 26.5, 17.5] }} color={COLORS.battery} position={[0, 38, 8.75]} />
          </>
        )}
        {/* driver board on its four standoffs: v1 40 x 25 mm in front of the LED, v2 70 x 25 mm where the battery would be */}
        <Primitive {...base} id="PCB1" layer="eletronica" shape={{ kind: "box", size: [board.w, 25, 1.6] }} color={COLORS.board} position={[board.x, board.y, 6.8]} />
        <Primitive {...base} id="U1" layer="eletronica" shape={{ kind: "box", size: [10, 1.4, 5.5] }} color="#c5ccd5" position={[board.x - board.w * 0.12, board.y + 4, 19.35]} />
        <Primitive {...base} id="U1" layer="eletronica" shape={{ kind: "cyl", r: 0.5, len: 4.5, axis: "z" }} color="#c5ccd5" position={[board.x - board.w * 0.12 + -2.54, board.y + 4, 8.6]} />
        <Primitive {...base} id="U1" layer="eletronica" shape={{ kind: "cyl", r: 0.5, len: 4.5, axis: "z" }} color="#c5ccd5" position={[board.x - board.w * 0.12 + 0, board.y + 4, 8.6]} />
        <Primitive {...base} id="U1" layer="eletronica" shape={{ kind: "cyl", r: 0.5, len: 4.5, axis: "z" }} color="#c5ccd5" position={[board.x - board.w * 0.12 + 2.54, board.y + 4, 8.6]} />
        <Primitive {...base} id="U1" layer="eletronica" shape={{ kind: "box", size: [10, 4.5, 9] }} color={COLORS.dark} position={[board.x - board.w * 0.12, board.y + 4, 12.1]} />
        <Primitive {...base} id="R1" layer="eletronica" shape={{ kind: "cyl", r: 1.75, len: 0.7, axis: "x" }} color="#2a4fd6" position={[board.x + board.w * 0.12 + -2.8, board.y - 3, 9.2]} />
        <Primitive {...base} id="R1" layer="eletronica" shape={{ kind: "cyl", r: 1.75, len: 0.7, axis: "x" }} color="#8a8f98" position={[board.x + board.w * 0.12 + -1.4, board.y - 3, 9.2]} />
        <Primitive {...base} id="R1" layer="eletronica" shape={{ kind: "cyl", r: 1.75, len: 0.7, axis: "x" }} color="#111111" position={[board.x + board.w * 0.12 + 0, board.y - 3, 9.2]} />
        <Primitive {...base} id="R1" layer="eletronica" shape={{ kind: "cyl", r: 1.75, len: 0.7, axis: "x" }} color="#d4af37" position={[board.x + board.w * 0.12 + 2.8, board.y - 3, 9.2]} />
        <Primitive {...base} id="R1" layer="eletronica" shape={{ kind: "cyl", r: 1.6, len: 9, axis: "x" }} color="#c9b27a" position={[board.x + board.w * 0.12, board.y - 3, 9.2]} />
        <Primitive {...base} id="C1" layer="eletronica" shape={{ kind: "box", size: [5, 3, 6] }} color="#d9a441" position={[board.x + board.w * 0.02, board.y - 7, 10.6]} />
        {version === "v2" && (
          <Primitive {...base} id="D2" layer="eletronica" shape={{ kind: "cyl", r: 1.8, len: 7, axis: "x" }} color="#1d2027" position={[board.x - board.w * 0.3, board.y - 7, 9.2]} />
        )}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) => (
            <Primitive key={`${sx},${sy}`} {...base} id="H3" layer="parafusos" shape={{ kind: "cyl", r: 3, len: 1.5, axis: "z" }} color={COLORS.screw} position={[board.x + (sx * (board.w - 7)) / 2, board.y + sy * 9, 8.5]} />
          )),
        )}
        {[-37.6, 37.6].flatMap((x) => [-37.6, 62.6].map((y) => <Primitive key={`${x},${y}`} {...base} id="H1" layer="parafusos" shape={{ kind: "cyl", r: 3, len: 2, axis: "z" }} color={COLORS.screw} position={[x, y, -3.4]} />))}
      </group>

      {/* on the box wall */}
      <Primitive {...base} id="SW1" layer="eletronica" shape={{ kind: "box", size: [17, 3, 11] }} color="#d9362b" position={[-25, -51.5 - e * 0.3, 20]} />
      <Primitive {...base} id="SW1" layer="eletronica" shape={{ kind: "cyl", r: 0.6, len: 6, axis: "y" }} color="#c5ccd5" position={[-30, -37 - e * 0.3, 17]} />
      <Primitive {...base} id="SW1" layer="eletronica" shape={{ kind: "cyl", r: 0.6, len: 6, axis: "y" }} color="#c5ccd5" position={[-20, -37 - e * 0.3, 17]} />
      <Primitive {...base} id="SW1" layer="eletronica" shape={{ kind: "box", size: [21.2, 10, 15] }} color={COLORS.dark} position={[-25, -45 - e * 0.3, 20]} />
      {version === "v2" && (
        <>
          <Primitive {...base} id="J1" layer="eletronica" shape={{ kind: "cyl", r: 6, len: 1.6, axis: "x" }} color="#c5ccd5" position={[41.8 + e * 0.3, 0, 20]} />
          <Primitive {...base} id="J1" layer="eletronica" shape={{ kind: "cyl", r: 4, len: 10, axis: "x" }} color="#262c36" position={[37 + e * 0.3, 0, 20]} />
          <Primitive {...base} id="J1" layer="eletronica" shape={{ kind: "cyl", r: 5, len: 12, axis: "x" }} color={COLORS.dark} position={[48 + e * 0.3, 0, 20]} />
          <Primitive {...base} id="RV1" layer="eletronica" shape={{ kind: "cyl", r: 3, len: 6, axis: "y" }} color="#c5ccd5" position={[25, -42 - e * 0.3, 20]} />
          <Primitive {...base} id="RV1" layer="eletronica" shape={{ kind: "cyl", r: 5, len: 1.6, axis: "y" }} color="#c5ccd5" position={[25, -41.4 - e * 0.3, 20]} />
          <Primitive {...base} id="RV1" layer="eletronica" shape={{ kind: "box", size: [1.2, 0.8, 6] }} color="#f4f1e6" position={[25, -53.2 - e * 0.3, 23]} />
          <Primitive {...base} id="RV1" layer="eletronica" shape={{ kind: "cyl", r: 7, len: 8, axis: "y" }} color={COLORS.knob} position={[25, -49 - e * 0.3, 20]} />
          <Primitive {...base} id="PS1" layer="eletronica" shape={{ kind: "cyl", r: 4.2, len: 10, axis: "x" }} color="#262c36" position={[59 + e * 0.3, 0, 20]} />
          <Wire {...base} id="PS1" layer="eletronica" points={[[64 + e * 0.3, 0, 20], [68 + e * 0.3, 0, 12], [71 + e * 0.3, 0, 14]]} color="#111111" r={1.6} />
          <Primitive {...base} id="PS1" layer="eletronica" shape={{ kind: "box", size: [38, 26, 24] }} color={COLORS.psu} opacity={0.6} position={[90 + e * 0.3, 0, 14]} />
        </>
      )}
      <Primitive {...base} id="L1" layer="lamina" shape={{ kind: "box", size: [76, 26, 1] }} color={COLORS.glass} opacity={0.4} position={[0, 0, 39.9 + e * 1.1]} />
      {[-24.4, 24.4].map((x) => (
        <Primitive key={x} {...base} id="H2" layer="parafusos" shape={{ kind: "cyl", r: 3, len: 2, axis: "y" }} color={COLORS.screw} position={[x, -12.8 - e * 0.9, 199.2]} />
      ))}

      {/* the pregoscopio, from the STEP; the moving group is the inner tube with its ring and sleeve */}
      <group position={[0, 0, headZ]}>
        <StlPart {...base} id="P1" layer="pregoscopio" url={pre(1)} color={COLORS.head} />
        <StlPart {...base} id="P2" layer="pregoscopio" url={pre(2)} color={COLORS.tube} />
        <StlPart {...base} id="P4" layer="pregoscopio" url={pre(4)} color={COLORS.hook} />
        <StlPart {...base} id="P5" layer="pregoscopio" url={pre(5)} color={COLORS.hook} />
        <StlPart {...base} id="P6" layer="pregoscopio" url={pre(6)} color={COLORS.knob} />
        <StlPart {...base} id="P10" layer="pregoscopio" url={pre(9)} color={COLORS.knob} />
        <group position={[0, 0, retract]}>
          <StlPart {...base} id="P3" layer="pregoscopio" url={pre(3)} color={COLORS.inner} />
          <StlPart {...base} id="P7" layer="pregoscopio" url={pre(7)} color={COLORS.ring} />
          <StlPart {...base} id="P8" layer="pregoscopio" url={pre(8)} color={COLORS.sleeve} />
        </group>
        <Primitive {...base} id="P9" layer="pregoscopio" shape={{ kind: "cyl", r: 10, len: OBJECTIVE_LENGTH, axis: "z" }} color={COLORS.metal} position={[0, 0, collarBottom - OBJECTIVE_LENGTH / 2]} />
      </group>
    </>
  );
}

function Controls({ target, view }: { target: Vec3; view: { name: string; n: number } }) {
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
    const presets: Record<string, Vec3> = { iso: [340, -420, 330], front: [0, -740, 125], side: [740, 0, 125], top: [0, -80, 780], inside: [80, -250, 120] };
    const p = presets[view.name];
    if (!p || !controls.current) return;
    camera.position.set(...p);
    controls.current.target.set(0, view.name === "top" ? 20 : 0, view.name === "inside" ? 22 : 118);
    controls.current.update();
    invalidate();
  }, [view, camera, invalidate]);
  return null;
}

/** Pushes overlapping labels apart (screen space, a few passes) so every ID stays readable. */
function spreadLabels(labels: { x: number; y: number }[], width = 34, height = 19) {
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

export function SuporteScene({ options, ids, view }: { options: SceneOptions; ids: string[]; view: { name: string; n: number } }) {
  const registry: Registry = useRef(new Map());
  const nodes = useRef(new Map<string, HTMLElement>());
  const target = useMemo<Vec3>(() => [0, 0, 118], []);
  const key = options.version;
  const { onPick } = options;
  return (
    <div className="suporte-stage">
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
        {options.lightOn && <pointLight position={[0, 0, 33 - options.explode]} intensity={900} distance={120} color="#ffe0a0" />}
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
            {id}
          </button>
        ))}
      </div>
      <span className="suporte-hint">arrastar: girar · rolar: zoom · botão direito: mover · clique numa peça ou ID para selecionar</span>
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

