import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getDefinition, pinPosition } from "@simiot/component-catalog";
import { buildNetlist } from "@simiot/netlist";
import { newId, type Placement, type TerminalRef } from "@simiot/project-model";
import { useApp, useProject } from "../store.ts";
import { movePart, rotatePart, terminalLabel, wireColor } from "../lib/editing.ts";
import { PartVisual } from "./PartVisual.tsx";

interface Drag {
  id: string;
  start: { x: number; y: number };
  origin: Placement;
  dx: number;
  dy: number;
  moved: boolean;
}

const INTERACTIVE = new Set(["pushbutton", "potentiometer", "slide-potentiometer"]);
const key = (t: TerminalRef) => `${t.componentId}:${t.pinId}`;

export function BreadboardView() {
  const project = useProject()!;
  const dispatch = useApp((s) => s.dispatch);
  const select = useApp((s) => s.select);
  const selection = useApp((s) => s.selection);
  const simState = useApp((s) => s.sim);
  const press = useApp((s) => s.press);
  const setPot = useApp((s) => s.setPot);
  const running = simState.runState === "running" || simState.runState === "paused" || simState.runState === "loaded";
  const lab = running ? simState.lab : undefined;
  const led13 = !!simState.ports && (simState.ports.B.port & (1 << 5)) !== 0;

  const [zoom, setZoom] = useState(1.25);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [pending, setPending] = useState<TerminalRef | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [wireDefault, setWireDefault] = useState("green");
  const canvasRef = useRef<HTMLDivElement>(null);

  const toWorld = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const r = canvasRef.current!.getBoundingClientRect();
      return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
    },
    [zoom],
  );

  const placementOf = useCallback(
    (id: string): Placement | undefined => {
      const p = project.breadboard.placements[id];
      if (!p) return undefined;
      if (drag?.id === id) return { ...p, x: drag.origin.x + drag.dx, y: drag.origin.y + drag.dy };
      return p;
    },
    [project, drag],
  );

  /** Every pin with its canvas position (a part being dragged follows the pointer). */
  const pins = useMemo(() => {
    const list: { ref: TerminalRef; x: number; y: number; label: string; hole: boolean }[] = [];
    for (const c of project.components) {
      const def = getDefinition(c.definitionId);
      const placement = placementOf(c.id);
      if (!def || !placement) continue;
      for (const pin of def.pins) {
        const pos = pinPosition(def, placement, pin);
        list.push({ ref: { componentId: c.id, pinId: pin.id }, ...pos, label: `${c.refDes}.${pin.label}`, hole: def.visual.kind === "breadboard" });
      }
    }
    return list;
  }, [project, placementOf]);
  const pinIndex = useMemo(() => new Map(pins.map((p) => [key(p.ref), p])), [pins]);
  const connected = useMemo(() => {
    const set = new Set<string>();
    for (const c of project.connections) {
      set.add(key(c.a));
      set.add(key(c.b));
    }
    return set;
  }, [project.connections]);
  const netOf = useMemo(() => buildNetlist(project).netOf, [project.components, project.connections]); // eslint-disable-line react-hooks/exhaustive-deps

  const size = useMemo(() => {
    let w = 1100;
    let h = 700;
    for (const c of project.components) {
      const def = getDefinition(c.definitionId);
      const p = project.breadboard.placements[c.id];
      if (def && p) {
        w = Math.max(w, p.x + def.size.width + 200);
        h = Math.max(h, p.y + def.size.height + 200);
      }
    }
    return { w, h };
  }, [project]);

  // drag lifecycle on window so fast pointer moves never escape the part
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const p = toWorld(e);
      setDrag((d) => d && { ...d, dx: p.x - d.start.x, dy: p.y - d.start.y, moved: d.moved || Math.hypot(p.x - d.start.x, p.y - d.start.y) > 2 });
    };
    const up = () => {
      setDrag((d) => {
        if (d?.moved) {
          const placement = { ...d.origin, x: Math.round(d.origin.x + d.dx), y: Math.round(d.origin.y + d.dy) };
          queueMicrotask(() => dispatch(movePart(useApp.getState().history!.present, d.id, placement)));
        }
        return null;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, toWorld, dispatch]);

  // keyboard: Delete/Backspace removes the selection, R rotates, Esc cancels a wire
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, .monaco-editor")) return;
      if (e.key === "Escape") setPending(null);
      const current = useApp.getState();
      const sel = current.selection;
      const present = current.history?.present;
      if (!sel || !present || current.tab !== "breadboard") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (sel.kind === "component") dispatch({ type: "removeComponent", componentId: sel.id });
        else dispatch({ type: "disconnect", connectionId: sel.id });
        select(null);
      } else if ((e.key === "r" || e.key === "R") && sel.kind === "component" && !e.ctrlKey && !e.metaKey) {
        const command = rotatePart(present, sel.id);
        if (command) dispatch(command);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, select]);

  const onPartDown = (e: ReactPointerEvent, id: string, definitionId: string) => {
    if (e.button !== 0) return;
    select({ kind: "component", id });
    if (running && INTERACTIVE.has(definitionId)) return; // the element handles presses and turns
    const origin = project.breadboard.placements[id];
    if (!origin) return;
    e.preventDefault();
    setDrag({ id, start: toWorld(e), origin, dx: 0, dy: 0, moved: false });
  };

  const onPinDown = (e: ReactPointerEvent, ref: TerminalRef) => {
    e.stopPropagation();
    e.preventDefault();
    if (!pending) {
      setPending(ref);
      setMouse(toWorld(e));
      return;
    }
    if (key(pending) !== key(ref)) {
      const color = wireColor(project, pending, ref, wireDefault);
      dispatch({ type: "connect", connection: { id: newId("conn"), kind: "wire", a: pending, b: ref }, color });
    }
    setPending(null);
  };

  const pendingPin = pending ? pinIndex.get(key(pending)) : undefined;

  return (
    <div className="bb-view">
      <div className="bb-toolbar">
        <span className="hint">
          {pending
            ? `Ligando ${terminalLabel(project, pending)}: clique no outro pino (Esc cancela)`
            : running
              ? "Simulação: clique nos botões e gire os potenciômetros"
              : "Arraste peças • clique em dois pinos para criar um fio • R gira • Delete apaga"}
        </span>
        <label>
          Fio
          <select value={wireDefault} onChange={(e) => setWireDefault(e.target.value)}>
            {["green", "orange", "blue", "yellow", "purple", "white"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} title="Diminuir zoom">−</button>
        <span className="zoom">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} title="Aumentar zoom">+</button>
      </div>
      <div
        className="bb-scroll"
        onPointerDown={() => {
          setPending(null);
          select(null);
        }}
      >
        <div
          ref={canvasRef}
          className="bb-canvas"
          style={{ width: size.w * zoom, height: size.h * zoom }}
          onPointerMove={(e) => pending && setMouse(toWorld(e))}
        >
          <div className="bb-world" style={{ transform: `scale(${zoom})`, width: size.w, height: size.h }}>
            {[...project.components]
              .sort((a, b) => Number(b.definitionId === "breadboard-half") - Number(a.definitionId === "breadboard-half"))
              .map((c) => {
                const def = getDefinition(c.definitionId);
                const p = placementOf(c.id);
                if (!def || !p) return null;
                const selected = selection?.kind === "component" && selection.id === c.id;
                const led = lab?.leds[c.id];
                return (
                  <div
                    key={c.id}
                    className={`part${selected ? " selected" : ""}${def.visual.kind === "breadboard" ? " board" : ""}`}
                    data-component={c.id}
                    style={{ left: p.x, top: p.y, width: def.size.width, height: def.size.height, transform: `rotate(${p.rotation}deg)` }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onPartDown(e, c.id, c.definitionId);
                    }}
                  >
                    <PartVisual
                      component={c}
                      def={def}
                      running={running}
                      sim={{
                        ...(led ? { led } : {}),
                        ...(lab?.buzzers[c.id] ? { buzzer: lab.buzzers[c.id] } : {}),
                        ...(lab?.servos[c.id] ? { servo: lab.servos[c.id] } : {}),
                        ...(lab?.ldrModules[c.id] ? { ldr: lab.ldrModules[c.id] } : {}),
                        device: simState.deviceStates[c.id],
                        powered: lab?.devicePower[c.id] ?? false,
                      }}
                      led13={led13}
                      onPress={(down) => press(c.id, down)}
                      onPot={(pos) => setPot(c.id, pos)}
                    />
                    {led?.warning && <div className="part-warning" title={led.warning}>!</div>}
                  </div>
                );
              })}
            <svg className="bb-overlay" width={size.w} height={size.h}>
              {project.connections
                .filter((c) => c.kind === "wire")
                .map((c) => {
                  const a = pinIndex.get(key(c.a));
                  const b = pinIndex.get(key(c.b));
                  if (!a || !b) return null;
                  const selected = selection?.kind === "connection" && selection.id === c.id;
                  const color = project.breadboard.wires[c.id]?.color ?? "green";
                  return (
                    <g
                      key={c.id}
                      className={`wire${selected ? " selected" : ""}`}
                      data-connection={c.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        select({ kind: "connection", id: c.id });
                      }}
                    >
                      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="wire-hit" />
                      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} className="wire-line" />
                    </g>
                  );
                })}
              {pendingPin && <line x1={pendingPin.x} y1={pendingPin.y} x2={mouse.x} y2={mouse.y} className="wire-pending" />}
              {pins.map((p) => {
                const k = key(p.ref);
                const reading = lab ? describeNet(netOf.get(k as `${string}:${string}`), lab.netVoltage) : undefined;
                return (
                  <circle
                    key={k}
                    cx={p.x}
                    cy={p.y}
                    r={p.hole ? 3.2 : 3.6}
                    className={`pin${connected.has(k) ? " connected" : ""}${p.hole ? " hole" : ""}${pending && key(pending) === k ? " active" : ""}`}
                    data-pin={k}
                    onPointerDown={(e) => onPinDown(e, p.ref)}
                  >
                    <title>{reading ? `${p.label} — ${reading}` : p.label}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "D13: 5.00 V" (or floating) for a pin's net during simulation. */
function describeNet(netId: string | undefined, voltages: Record<string, number>): string | undefined {
  if (!netId) return undefined;
  const v = voltages[netId];
  return v === undefined ? `${netId}: flutuante` : `${netId}: ${v.toFixed(2)} V`;
}

