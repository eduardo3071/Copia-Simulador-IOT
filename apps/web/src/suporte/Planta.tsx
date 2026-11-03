import { useMemo } from "react";
import { DEFAULT_HOLDER_PARAMS, holderLayout, masterPlan, type PlacedPart, type SuporteVersion } from "@simiot/adapter-cad";
import { spreadLabels } from "./Scene.tsx";

type View = "top" | "front" | "side";
type Pt = { x: number; y: number };

/** The three views of the master plan, drawn at 1 SVG unit = 1 mm. Screen y is flipped so +Z and +Y point up. */
function project(view: View, p: { x: number; y: number; z: number }): Pt {
  if (view === "top") return { x: p.x, y: -p.y };
  if (view === "front") return { x: p.x, y: -p.z };
  return { x: p.y, y: -p.z };
}

/** Horizontal dimension line from x1 to x2 at height y, with the label centred. */
function DimH({ x1, x2, y, label, up = false }: { x1: number; x2: number; y: number; label: string; up?: boolean }) {
  const s = up ? -1 : 1;
  return (
    <g className="pl-dim">
      <line x1={x1} x2={x1} y1={y - s * 2} y2={y + s * 3} />
      <line x1={x2} x2={x2} y1={y - s * 2} y2={y + s * 3} />
      <line x1={x1} x2={x2} y1={y + s * 2} y2={y + s * 2} markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x={(x1 + x2) / 2} y={y + s * 2 + (up ? -1.2 : 4.2)} textAnchor="middle">{label}</text>
    </g>
  );
}

function DimV({ y1, y2, x, label, left = true }: { y1: number; y2: number; x: number; label: string; left?: boolean }) {
  const s = left ? -1 : 1;
  const mid = (y1 + y2) / 2;
  return (
    <g className="pl-dim">
      <line y1={y1} y2={y1} x1={x - s * 2} x2={x + s * 3} />
      <line y1={y2} y2={y2} x1={x - s * 2} x2={x + s * 3} />
      <line y1={y1} y2={y2} x1={x + s * 2} x2={x + s * 2} markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text transform={`translate(${x + s * 2 + (left ? -1.2 : 4.2)} ${mid}) rotate(-90)`} textAnchor="middle">{label}</text>
    </g>
  );
}

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/** ID balloons with leader lines, pushed outward from the drawing centre and then spread so none overlap. */
function Balloons({ view, parts, centre }: { view: View; parts: PlacedPart[]; centre: Pt }) {
  const items = useMemo(() => {
    const raw = parts.map((p) => {
      const at = project(view, p);
      const dx = at.x - centre.x;
      const dy = at.y - centre.y;
      const len = Math.hypot(dx, dy) || 1;
      return { id: p.id, at, x: at.x + (dx / len) * 16, y: at.y + (dy / len) * 16 };
    });
    spreadLabels(raw, 11, 11);
    return raw;
  }, [view, parts, centre.x, centre.y]);
  return (
    <g className="pl-balloons">
      {items.map((b) => (
        <g key={b.id}>
          <line x1={b.at.x} y1={b.at.y} x2={b.x} y2={b.y} />
          <circle cx={b.at.x} cy={b.at.y} r={0.9} className="pl-dot" />
          <circle cx={b.x} cy={b.y} r={5.2} />
          <text x={b.x} y={b.y + 1.5} textAnchor="middle">{b.id}</text>
        </g>
      ))}
    </g>
  );
}

const VISIBLE_IN: Record<View, string[]> = {
  top: ["M1", "M2", "M4", "L1", "D1", "PCB1", "U1", "R1", "C1", "D2", "SW1", "J1", "RV1", "PS1", "BT1"],
  front: ["M1", "M2", "P1", "P2", "P9", "L1", "SW1", "RV1", "D1"],
  side: ["M1", "M3", "M2", "P2", "P9", "L1", "D1", "PCB1", "BT1", "J1", "PS1", "U1"],
};

export function PlantaMae({ version, view }: { version: SuporteVersion; view: View }) {
  const layout = useMemo(() => holderLayout({ ...DEFAULT_HOLDER_PARAMS, variant: version === "v1" ? "pilha" : "fonte" }), [version]);
  const plan = useMemo(() => masterPlan(version), [version]);
  const { box, cavity, column, ring, tube, board, ledPost, params: p } = layout;
  const parts = plan.filter((q) => VISIBLE_IN[view].includes(q.id));
  const v2 = version === "v2";
  const top = tube.top + 15;

  // each view: the extents in screen units (x0, y0, width, height) with room for dimensions and balloons
  const frame =
    view === "top" ? { x0: -78, y0: -(box.yMax + 34), w: 78 + (v2 ? 128 : 78), h: box.yMax - box.yMin + 68 }
    : view === "front" ? { x0: -78, y0: -(top + 22), w: 156 + (v2 ? 50 : 0), h: top + 62 }
    : { x0: box.yMin - 34, y0: -(top + 22), w: box.yMax - box.yMin + 68, h: top + 62 };
  const centre: Pt = { x: frame.x0 + frame.w / 2, y: frame.y0 + frame.h / 2 };
  const rect = (x1: number, x2: number, y1: number, y2: number, cls: string, rx = 0) => (
    <rect x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} className={cls} rx={rx} />
  );

  return (
    <svg className="planta" viewBox={`${frame.x0} ${frame.y0} ${frame.w} ${frame.h}`} role="img" aria-label={`Planta-mãe, vista ${view}`}>
      <defs>
        <marker id="arr" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L6 3 L0 6 z" fill="#1a56b8" /></marker>
      </defs>
      {view === "top" && (
        <>
          {rect(box.xMin, box.xMax, -box.yMax, -box.yMin, "pl-out", p.cornerRadius)}
          {rect(cavity.xMin, cavity.xMax, -cavity.yMax, -cavity.yMin, "pl-hid", p.cornerRadius - p.wall > 0 ? p.cornerRadius - p.wall : 0)}
          {rect(column.xMin, column.xMax, -column.yMax, -column.yMin, "pl-out pl-soft", p.columnRound)}
          {rect(-p.columnWidth / 2, p.columnWidth / 2, -layout.arm.yMax, -layout.arm.yMin, "pl-out pl-soft")}
          <circle r={ring.outerRadius} className="pl-out pl-soft" />
          <circle r={ring.boreDiameter / 2} className="pl-out" />
          <circle r={p.ledWindowDiameter / 2} className="pl-hid" />
          <circle r={p.diffuserDiameter / 2} className="pl-hid" />
          {rect(box.xMin - 3, box.xMax + 3, -(p.slideWidth + p.slideFit) / 2, (p.slideWidth + p.slideFit) / 2, "pl-hid")}
          {rect(-38, 38, -13, 13, "pl-glass")}
          <circle r={ledPost.diameter / 2} className="pl-hid" />
          {rect(board.xMin, board.xMax, -board.yMax, -board.yMin, "pl-board")}
          {layout.cradle && rect(layout.cradle.xMin, layout.cradle.xMax, -layout.cradle.yMax, -layout.cradle.yMin, "pl-hid")}
          {!v2 && rect(-p.batteryLength / 2, p.batteryLength / 2, -(p.batteryY + p.batteryWidth / 2), -(p.batteryY - p.batteryWidth / 2), "pl-batt")}
          {layout.boardPosts.map((b, i) => <circle key={i} cx={b.x} cy={-b.y} r={1.7} className="pl-hole" />)}
          {layout.lid.holes.map((h, i) => <circle key={i} cx={h.x} cy={-h.y} r={1.7} className="pl-hole" />)}
          {rect(p.switchCutout.x - 10.6, p.switchCutout.x + 10.6, -box.yMin + 0, -box.yMin - p.wall, "pl-cut")}
          {v2 && rect(p.knobX - 3.75, p.knobX + 3.75, -box.yMin, -box.yMin - p.wall, "pl-cut")}
          {v2 && rect(box.xMax - p.wall, box.xMax, -(p.jackY + 3.9), -(p.jackY - 3.9), "pl-cut")}
          {v2 && rect(box.xMax + 22, box.xMax + 60, -13, 13, "pl-ghost")}
          <DimH x1={box.xMin} x2={box.xMax} y={-box.yMin + 6} label={`${fmt(box.xMax - box.xMin)}`} />
          <DimV y1={-box.yMax} y2={-box.yMin} x={box.xMin - 6} label={`${fmt(box.yMax - box.yMin)}`} />
          <DimV y1={-column.yMax} y2={-column.yMin} x={column.xMax + 6} label={`${fmt(p.columnDepth)}`} left={false} />
          <DimH x1={column.xMin} x2={column.xMax} y={-column.yMax - 6} label={`${fmt(p.columnWidth)}`} up />
          <DimH x1={0} x2={p.switchCutout.x} y={-box.yMin + 14} label={`${fmt(Math.abs(p.switchCutout.x))}`} />
          {v2 && <DimH x1={0} x2={p.knobX} y={-box.yMin + 14} label={`${fmt(p.knobX)}`} />}
          <DimV y1={0} y2={-box.yMin} x={box.xMax + 6} label={`${fmt(-box.yMin)}`} left={false} />
        </>
      )}
      {view === "front" && (
        <>
          {rect(box.xMin, box.xMax, 0, -box.height, "pl-out pl-soft", 2)}
          {rect(box.xMin, box.xMax, 0, p.wall, "pl-lid")}
          {rect(column.xMin, column.xMax, -box.height, -tube.top, "pl-hid")}
          {rect(-tube.radius, tube.radius, -tube.bottom, -tube.top, "pl-tube")}
          {rect(-ring.outerRadius, ring.outerRadius, -ring.bottom, -ring.top, "pl-out pl-soft")}
          {rect(-ring.boreDiameter / 2, ring.boreDiameter / 2, -ring.bottom, -ring.top, "pl-hid")}
          {rect(-tube.sleeveRadius, tube.sleeveRadius, -tube.sleeveBottom, -tube.bottom, "pl-tube")}
          {rect(-tube.objectiveRadius, tube.objectiveRadius, -tube.noseZ, -(tube.noseZ + p.objectiveLength), "pl-obj")}
          {rect(-25, 25, -tube.top, -top, "pl-out pl-soft")}
          {rect(-38, 38, -(layout.samplePlane - 1), -layout.samplePlane, "pl-glass")}
          {rect(p.switchCutout.x - 10.6, p.switchCutout.x + 10.6, -(box.height / 2 - 7.5), -(box.height / 2 + 7.5), "pl-cut")}
          {v2 && <circle cx={p.knobX} cy={-box.height / 2} r={p.knobDiameter / 2} className="pl-cut" />}
          <DimH x1={box.xMin} x2={box.xMax} y={14} label={fmt(box.xMax - box.xMin)} />
          <DimV y1={0} y2={-box.height} x={box.xMin - 6} label={fmt(box.height)} />
          <DimV y1={0} y2={-tube.top} x={box.xMax + 30} label={fmt(tube.top)} left={false} />
          <DimV y1={-ring.bottom} y2={-ring.top} x={box.xMax + 14} label={fmt(p.ringHeight)} left={false} />
          <DimV y1={0} y2={-tube.noseZ} x={box.xMin - 22} label={fmt(tube.noseZ)} />
          <DimH x1={-tube.radius} x2={tube.radius} y={-tube.bottom + 14} label={`⌀ ${fmt(p.tubeDiameter)}`} />
        </>
      )}
      {view === "side" && (
        <>
          {rect(box.yMin, box.yMax, 0, -box.height, "pl-out pl-soft", 2)}
          {rect(box.yMin, box.yMax, 0, p.wall, "pl-lid")}
          {rect(column.yMin, column.yMax, -box.height, -tube.top, "pl-out pl-soft")}
          {layout.columnWindow && rect(column.yMin + 0, column.yMax, -layout.columnWindow.zMin, -layout.columnWindow.zMax, "pl-hid")}
          {rect(layout.arm.yMin, layout.arm.yMax, -ring.bottom, -ring.top, "pl-out pl-soft")}
          {rect(-ring.outerRadius, ring.outerRadius, -ring.bottom, -ring.top, "pl-out pl-soft")}
          {rect(-tube.radius, tube.radius, -tube.bottom, -tube.top, "pl-tube")}
          {rect(-tube.sleeveRadius, tube.sleeveRadius, -tube.sleeveBottom, -tube.bottom, "pl-tube")}
          {rect(-tube.objectiveRadius, tube.objectiveRadius, -tube.noseZ, -(tube.noseZ + p.objectiveLength), "pl-obj")}
          {rect(-7.5, 7.5, -tube.top, -top, "pl-out pl-soft")}
          {rect(-13, 13, -(layout.samplePlane - 1), -layout.samplePlane, "pl-glass")}
          {rect(board.yMin, board.yMax, -p.driverBoards[p.variant].standoffHeight, -p.driverBoards[p.variant].standoffHeight - 1.6, "pl-board")}
          {rect(-ledPost.diameter / 2, ledPost.diameter / 2, 0, -ledPost.top, "pl-hid")}
          {layout.cradle && rect(layout.cradle.yMin, layout.cradle.yMax, 0, -layout.cradle.height, "pl-hid")}
          {!v2 && rect(p.batteryY - p.batteryWidth / 2, p.batteryY + p.batteryWidth / 2, 0, -17.5, "pl-batt")}
          <DimH x1={box.yMin} x2={box.yMax} y={14} label={fmt(box.yMax - box.yMin)} />
          <DimV y1={0} y2={-tube.top} x={box.yMin - 6} label={fmt(tube.top)} />
          <DimV y1={-layout.samplePlane} y2={-tube.noseZ} x={box.yMin + 30} label={fmt(p.workingDistance)} left={false} />
          <DimV y1={0} y2={-layout.samplePlane} x={box.yMax + 8} label={fmt(layout.samplePlane)} left={false} />
        </>
      )}
      <Balloons view={view} parts={parts} centre={centre} />
    </svg>
  );
}
