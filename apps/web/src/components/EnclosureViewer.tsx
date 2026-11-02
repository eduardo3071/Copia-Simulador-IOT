import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { EnclosureLayout, MeshData } from "@simiot/adapter-cad";

type Vec3 = [number, number, number];

function Part({ mesh, color, opacity = 1, z = 0 }: { mesh: MeshData; color: string; opacity?: number; z?: number }) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(mesh.positions, 3));
    g.setAttribute("normal", new BufferAttribute(mesh.normals, 3));
    g.setIndex(new BufferAttribute(mesh.indices, 1));
    return g;
  }, [mesh]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, 0, z]}>
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} roughness={0.75} metalness={0.05} />
    </mesh>
  );
}

/** Orbit around the enclosure; the canvas only redraws when the camera moves. */
function Controls({ target }: { target: Vec3 }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const { width, height } = useThree((s) => s.size);
  const [tx, ty, tz] = target;
  // resizing a WebGL canvas clears it: on-demand rendering must redraw after layout settles
  useEffect(() => {
    invalidate();
    const frame = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(frame);
  }, [width, height, invalidate]);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(tx, ty, tz);
    controls.update();
    const redraw = () => invalidate();
    controls.addEventListener("change", redraw);
    invalidate();
    return () => {
      controls.removeEventListener("change", redraw);
      controls.dispose();
    };
  }, [camera, gl, invalidate, tx, ty, tz]);
  return null;
}

export interface ViewerOptions {
  showLid: boolean;
  exploded: boolean;
  showPcb: boolean;
}

/** Millimetres, board centre at the origin, +Z up (same frame as the layout). */
export function EnclosureViewer({ layout, base, lid, options }: { layout: EnclosureLayout; base: MeshData; lid: MeshData; options: ViewerOptions }) {
  const size = Math.max(layout.outer.width, layout.outer.depth, layout.totalHeight);
  const camera = { position: [size * 0.9, -size * 1.5, size * 1.1] as Vec3, up: [0, 0, 1] as Vec3, fov: 40, near: 0.5, far: size * 30 };
  const lidZ = options.exploded ? layout.totalHeight * 0.7 : 0;
  return (
    <Canvas frameloop="demand" camera={camera}>
      <color attach="background" args={["#1b1e25"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[size, -size, size * 2]} intensity={1.8} />
      <directionalLight position={[-size, size * 1.5, size * 0.5]} intensity={0.6} />
      <Part mesh={base} color="#c9ced8" />
      {options.showLid && <Part mesh={lid} color="#8fb0e0" opacity={options.exploded ? 1 : 0.35} z={lidZ} />}
      {options.showPcb && (
        <mesh position={[0, 0, (layout.pcb.bottom + layout.pcb.top) / 2]}>
          <boxGeometry args={[layout.pcb.width, layout.pcb.depth, layout.pcb.thickness]} />
          <meshStandardMaterial color="#2f8f4e" transparent opacity={0.85} />
        </mesh>
      )}
      <Controls target={[0, 0, layout.baseHeight / 2]} />
    </Canvas>
  );
}
