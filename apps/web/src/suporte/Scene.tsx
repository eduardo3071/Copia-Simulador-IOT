import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Color, DoubleSide, Group, Object3D, Plane, Vector3 } from "three";
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
export type Layer = "impressa" | "pregoscopio" | "eletronica" | "parafusos" | "lamina";

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
  P1: [-30, 0, 8], P2: [0, -15, -70], P3: [0, -11.7, -140], P4: [-60, 0, 34], P5: [60, 0, 34], P6: [79, 17, 10], P7: [13.7, 0, -145], P8: [18, 0, -148],
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

function Assembly({ options, registry }: { options: SceneOptions; registry: Registry }) {
  const { version, explode: e, retract } = options;
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  plane.constant = -options.cut;
  const v = version === "v1" ? "v1-pilha" : "v2-fonte";
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

      {/* everything that rides on the lid */}
      <group position={[0, 0, lidZ]}>
        <StlPart {...base} id="M3" layer="impressa" url={stl(`${v}/tampa-fundo.stl`)} color={COLORS.lid} />
        <Primitive {...base} id="D1" layer="eletronica" shape={{ kind: "cyl", r: 2.5, len: 4.5, axis: "z" }} color={COLORS.led} emissive={options.lightOn ? "#ffd27a" : undefined} position={[0, 0, 30.85]} />
        <Primitive {...base} id="D1" layer="eletronica" shape={{ kind: "dome" }} color={COLORS.led} emissive={options.lightOn ? "#ffd27a" : undefined} position={[0, 0, 33.1]} />
        {version === "v1" ? (
          <>
            <Primitive {...base} id="BT1" layer="eletronica" shape={{ kind: "box", size: [48.5, 26.5, 17.5] }} color={COLORS.battery} position={[0, 38, 8.75]} />
            <Primitive {...base} id="R1" layer="eletronica" shape={{ kind: "cyl", r: 1.6, len: 9, axis: "x" }} color="#c9b27a" position={[-26, 12, 3.2]} />
          </>
        ) : (
          <>
            <Primitive {...base} id="PCB1" layer="eletronica" shape={{ kind: "box", size: [60, 25, 1.6] }} color={COLORS.board} position={[0, 38, 6.8]} />
            <Primitive {...base} id="U1" layer="eletronica" shape={{ kind: "box", size: [10, 4.5, 9] }} color={COLORS.dark} position={[-14, 38, 12.1]} />
            <Primitive {...base} id="R1" layer="eletronica" shape={{ kind: "cyl", r: 1.6, len: 9, axis: "x" }} color="#c9b27a" position={[8, 42, 9.2]} />
            {[-26.5, 26.5].flatMap((x) => [29, 47].map((y) => <Primitive key={`${x},${y}`} {...base} id="H3" layer="parafusos" shape={{ kind: "cyl", r: 3, len: 1.5, axis: "z" }} color={COLORS.screw} position={[x, y, 8.5]} />))}
          </>
        )}
        {[-37.6, 37.6].flatMap((x) => [-37.6, 62.6].map((y) => <Primitive key={`${x},${y}`} {...base} id="H1" layer="parafusos" shape={{ kind: "cyl", r: 3, len: 2, axis: "z" }} color={COLORS.screw} position={[x, y, -3.4]} />))}
      </group>

      {/* on the box wall */}
      <Primitive {...base} id="SW1" layer="eletronica" shape={{ kind: "box", size: [21.2, 10, 15] }} color={COLORS.dark} position={[-25, -45 - e * 0.3, 20]} />
      {version === "v2" && (
        <>
          <Primitive {...base} id="J1" layer="eletronica" shape={{ kind: "cyl", r: 5, len: 12, axis: "x" }} color={COLORS.dark} position={[48 + e * 0.3, 0, 20]} />
          <Primitive {...base} id="RV1" layer="eletronica" shape={{ kind: "cyl", r: 7, len: 8, axis: "y" }} color={COLORS.knob} position={[25, -49 - e * 0.3, 20]} />
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

/** Moves the ID labels over the canvas after each frame. */
function Projector({ registry, nodes }: { registry: Registry; nodes: MutableRefObject<Map<string, HTMLElement>> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const point = useMemo(() => new Vector3(), []);
  useFrame(() => {
    for (const [id, entry] of registry.current) {
      const node = nodes.current.get(id);
      if (!node) continue;
      point.copy(entry.local);
      entry.object.localToWorld(point);
      point.project(camera);
      const visible = point.z < 1 && entry.object.visible && entry.object.children.length > 0;
      node.style.display = visible ? "" : "none";
      node.style.transform = `translate(${((point.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-point.y * 0.5 + 0.5) * size.height).toFixed(1)}px) translate(-50%, -50%)`;
    }
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
        <Projector registry={registry} nodes={nodes} />
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

