import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { DEFAULT_HOLDER_PARAMS, holderLayout, masterPlan, type SuporteVersion } from "@simiot/adapter-cad";
import { T, useLang } from "./lang.tsx";
import {
  Balloon, Circ, circleSegs, Ctr, CutMark, DimH, DimV, f, Lead, Line, Rect, rectSegs, Sheet, Shape, Solid, Void, VoidShape, ViewTitle,
  type Seg, type SheetInfo, type V,
} from "./dt.tsx";

export const DOC_REV = "A";
export const DOC_DATE = "2026-11-03";

const NOTES: SheetInfo["notes"] = [
  { pt: "Cotas em mm. Tolerância geral ±0,2 mm (ISO 2768-m). Folgas de encaixe conforme os gabaritos G1 a G3.", zh: "尺寸单位 mm。未注公差 ±0.2 mm（ISO 2768-m）。配合间隙以校准件 G1~G3 为准。" },
  { pt: "PLA, camada 0,2 mm, 3 perímetros, enchimento 20 a 30 %. Orientação de impressão: ver capa.", zh: "PLA，层高 0.2 mm，3 层外壁，填充 20~30%。打印方向见封面。" },
  { pt: "Cotas com (*) dependem da calibração física e podem mudar na revisão B.", zh: "带 (*) 的尺寸取决于实物校准，B 版可能调整。" },
];

function geometry(version: SuporteVersion) {
  const L = holderLayout({ ...DEFAULT_HOLDER_PARAMS, variant: version === "v1" ? "pilha" : "fonte" });
  const p = L.params;
  return {
    L, p, R: L.ring.outerRadius, bore: L.ring.boreDiameter / 2, earX: L.ears[1]!.x, earHalf: L.ears[1]!.width / 2, sw: p.switchCutout, wall: p.wall,
    v2: version === "v2", box: L.box, cav: L.cavity, col: L.column, ring: L.ring, arm: L.arm, tube: L.tube,
  };
}
type G = ReturnType<typeof geometry>;

const info = (version: SuporteVersion, code: string, titlePt: string, titleZh: string, part: string, scale: string, sheet: number, total: number): SheetInfo => ({
  code: `${code}-${version}`, titlePt, titleZh, part, scale, sheet, total, version, rev: DOC_REV, date: DOC_DATE, notes: NOTES,
});

/** Column and arm as a side profile (u = y, w = z), with the two R8 corners. */
function profileSegs(g: G, zTop: number): Seg[] {
  const r = g.p.columnRound;
  const y0 = g.col.yMin;
  const y1 = g.col.yMax;
  const zb = g.col.bottom;
  const zt = g.col.top;
  const ab = g.arm.bottom;
  const full = zTop >= zt;
  return [
    ["M", y1, zb], ["L", y1, full ? zt - r : zTop],
    ...(full ? ([["A", r, y1 - r, zt, 0], ["L", g.bore, zt], ["L", g.bore, ab], ["L", y0 - r, ab], ["A", r, y0, ab - r, 1]] as Seg[]) : ([["L", y0, zTop]] as Seg[])),
    ["L", y0, zb], ["Z"],
  ];
}

function stadiumSegs(u1: number, u2: number, w1: number, w2: number): Seg[] {
  const r = (u2 - u1) / 2 - 0.01;
  return [["M", u1, w1 + r], ["A", r, u2, w1 + r, 0], ["L", u2, w2 - r], ["A", r, u1, w2 - r, 0], ["Z"]];
}

function roundedSegs(u1: number, u2: number, w1: number, w2: number, r: number): Seg[] {
  return [
    ["M", u1 + r, w1], ["L", u2 - r, w1], ["A", r, u2, w1 + r, 0], ["L", u2, w2 - r], ["A", r, u2 - r, w2, 0],
    ["L", u1 + r, w2], ["A", r, u1, w2 - r, 0], ["L", u1, w1 + r], ["A", r, u1 + r, w1, 0], ["Z"],
  ];
}

/**
 * Outline of the objective seen from the side (measured on the product photo): tip, stepped nose, black grip, collar, blue ring, body.
 * `z0` is the tip; `maxH` clips it for a detail.
 */
function objectiveSegs(z0: number, maxH = 35): Seg[] {
  const half: [number, number][] = [[5.4, 0], [5.4, 2], [7.1, 2], [7.1, 5], [9.6, 5], [9.6, 6.7], [9.1, 6.7], [9.1, 15.1], [10, 15.1], [10, 34.3], [9.6, 34.3], [9.6, 35]];
  const pts: [number, number][] = [];
  for (const q of half) {
    if (q[1] > maxH) {
      pts.push([pts.at(-1)![0], maxH]);
      break;
    }
    pts.push(q);
  }
  const top = pts.at(-1)!;
  return [
    ["M", -pts[0]![0], z0],
    ...pts.map(([r, h]) => ["L", r, z0 + h] as Seg),
    ["L", -top[0], z0 + top[1]],
    ...[...pts].reverse().map(([r, h]) => ["L", -r, z0 + h] as Seg),
    ["Z"],
  ];
}

/** The light box seen in the x = 0 plane: walls, roof and the rounded top edge. */
function shellSegs(g: G): Seg[] {
  const { box, cav } = g;
  return [
    ["M", box.yMin, 0], ["L", box.yMin, box.height - 2], ["A", 2, box.yMin + 2, box.height, 1], ["L", box.yMax, box.height], ["L", box.yMax, 0],
    ["L", cav.yMax, 0], ["L", cav.yMax, cav.top], ["L", cav.yMin, cav.top], ["L", cav.yMin, 0], ["Z"],
  ];
}

/** Lines of text at (x, y), `pitch` apart. A line flagged `zh` is the Chinese twin of the line before it. */
function Block({ x, y, lines, pitch = 4.8, head }: { x: number; y: number; lines: { t: string; zh?: boolean; b?: boolean }[]; pitch?: number; head?: string }) {
  const lang = useLang();
  const shown = lines.filter((l, i) => {
    if (lang === "bi") return true;
    if (lang === "zh") return l.zh || !lines[i + 1]?.zh;
    return !l.zh;
  });
  return (
    <g>
      {head && <T className="dt-t dt-tnh" x={x} y={y}>{head}</T>}
      {shown.map((l, i) => <T key={i} className={`dt-t dt-tn${l.zh && lang === "bi" ? " dt-tzh" : ""}${l.b ? " dt-tv" : ""}`} x={x} y={y + (head ? 6 : 0) + i * pitch}>{l.t}</T>)}
    </g>
  );
}

/* ================= DT-01 ================= */
function Conjunto({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { p, R, earX, earHalf, box, col, ring, tube, sw } = g;
  const s = 0.5;
  const front: V = { ox: 66, oy: 128, s };
  const side: V = { ox: 190, oy: 128, s, fx: -1 };
  const top: V = { ox: 258, oy: 63, s };
  const head = tube.top + 15;
  return (
    <Sheet info={info(version, "DT-01", "Conjunto geral", "总装图", "Conjunto 总成", "1:2", sheet, total)}>
      {/* front */}
      <Rect v={front} u1={-45} u2={45} w1={0} w2={40} r={1} />
      <Rect v={front} u1={-45} u2={45} w1={-p.wall} w2={0} />
      <Rect v={front} u1={-22} u2={22} w1={col.bottom} w2={col.top} />
      <Rect v={front} u1={-R} u2={R} w1={ring.bottom} w2={ring.top} fill="#fff" />
      <Rect v={front} u1={earX - earHalf} u2={earX + earHalf} w1={ring.bottom} w2={ring.top} fill="#fff" />
      <Rect v={front} u1={-earX - earHalf} u2={-earX + earHalf} w1={ring.bottom} w2={ring.top} fill="#fff" />
      <Rect v={front} u1={-tube.radius} u2={tube.radius} w1={tube.bottom} w2={tube.top} fill="#fff" />
      <Rect v={front} u1={-25} u2={25} w1={tube.top} w2={head} fill="#fff" />
      <Rect v={front} u1={-tube.sleeveRadius} u2={tube.sleeveRadius} w1={tube.sleeveBottom} w2={tube.bottom} fill="#fff" />
      <Shape v={front} segs={objectiveSegs(tube.noseZ)} fill="#fff" />
      <Rect v={front} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={20 - sw.height / 2} w2={20 + sw.height / 2} fill="#fdecea" />
      {g.v2 && <Circ v={front} u={p.knobX} w={20} r={p.knobDiameter / 2} />}
      <Line v={front} a={[0, -4]} b={[0, head + 6]} c="ctr" />
      <DimV v={front} w1={0} w2={tube.top} u={-45} off={-12} />
      <DimV v={front} w1={0} w2={40} u={45} off={9} />
      <DimV v={front} w1={ring.bottom} w2={ring.top} u={earX + earHalf} off={9} />
      <DimH v={front} u1={-45} u2={45} w={-p.wall} off={-7} />
      <DimH v={front} u1={-tube.radius} u2={tube.radius} w={tube.bottom} off={-6} text={`⌀${f(p.tubeDiameter)} (*)`} />
      <Balloon v={front} at={[45, 30]} dx={14} dy={-8} id="M1" />
      <Balloon v={front} at={[-40, -1.2]} dx={-12} dy={10} id="M3" />
      <Balloon v={front} at={[earX + earHalf, ring.top - 14]} dx={15} dy={6} id="M2" />
      <Balloon v={front} at={[-25, tube.top + 7.5]} dx={-14} dy={-4} id="P1" />
      <Balloon v={front} at={[tube.radius, 150]} dx={15} dy={0} id="P2" />
      <Balloon v={front} at={[tube.objectiveRadius, 58]} dx={17} dy={0} id="P9" />
      <Balloon v={front} at={[sw.x - sw.width / 2, 22]} dx={-14} dy={-14} id="SW1" />
      {g.v2 && <Balloon v={front} at={[p.knobX, 20]} dx={14} dy={12} id="RV1" />}
      <ViewTitle x={front.ox} y={148} text="Vista frontal · 正视图" scale="1:2" />
      {/* left */}
      <Rect v={side} u1={-45} u2={70} w1={0} w2={40} r={1} />
      <Rect v={side} u1={-45} u2={70} w1={-p.wall} w2={0} />
      <Shape v={side} segs={profileSegs(g, tube.top)} />
      <Rect v={side} u1={-R} u2={R} w1={ring.bottom} w2={ring.top} c="hid" />
      <Rect v={side} u1={-tube.radius} u2={tube.radius} w1={tube.bottom} w2={tube.top} fill="#fff" />
      <Rect v={side} u1={-7.5} u2={7.5} w1={tube.top} w2={head} fill="#fff" />
      <Rect v={side} u1={-tube.sleeveRadius} u2={tube.sleeveRadius} w1={tube.sleeveBottom} w2={tube.bottom} fill="#fff" />
      <Shape v={side} segs={objectiveSegs(tube.noseZ)} fill="#fff" />
      <Rect v={side} u1={-13} u2={13} w1={39.4} w2={40.4} />
      {g.v2 && <Circ v={side} u={0} w={20} r={p.jackDiameter / 2} c="hid" />}
      <DimH v={side} u1={-45} u2={70} w={-p.wall} off={-7} />
      <DimV v={side} w1={0} w2={tube.top} u={70} off={-12} />
      <Lead v={side} at={[-tube.objectiveRadius, 40.8]} dx={14} dy={20} text="folga óptica 0,8" />
      <Balloon v={side} at={[55, 120]} dx={-14} dy={-10} id="M1" />
      <Balloon v={side} at={[0, 140]} dx={15} dy={-8} id="P2" />
      {g.v2 && <Balloon v={side} at={[0, 20]} dx={-26} dy={-26} id="J1" />}
      <ViewTitle x={side.ox - 8} y={148} text="Vista lateral esquerda · 左视图" scale="1:2" />
      {/* plan */}
      <Rect v={top} u1={-45} u2={45} w1={-45} w2={70} r={6} />
      <Rect v={top} u1={-22} u2={22} w1={col.yMin} w2={col.yMax} />
      <Rect v={top} u1={-22} u2={22} w1={0} w2={col.yMin + 0.5} />
      <Circ v={top} u={0} w={0} r={R} fill="#fff" />
      <Circ v={top} u={0} w={0} r={g.bore} fill="#fff" />
      <Rect v={top} u1={-25} u2={25} w1={-7.5} w2={7.5} fill="#fff" />
      <Rect v={top} u1={-38} u2={38} w1={-13} w2={13} c="hid" />
      <Ctr v={top} u={0} w={0} len={30} />
      <DimH v={top} u1={-45} u2={45} w={-45} off={-6} />
      <DimV v={top} w1={-45} w2={70} u={-45} off={-8} />
      <Balloon v={top} at={[0, 55]} dx={-22} dy={-6} id="M1" />
      <Balloon v={top} at={[38, 8]} dx={-4} dy={22} id="L1" />
      <ViewTitle x={top.ox} y={100} text="Vista superior · 俯视图" scale="1:2" />
      <Block
        x={8}
        y={156}
        lines={[{ t: `Tubo ⌀${f(p.tubeDiameter)} (*) · luva ⌀${f(p.sleeveDiameter)} · objetiva ⌀${f(p.objectiveDiameter)} × ${f(p.objectiveLength)} · lente em z = ${f(tube.noseZ)} · folga 0,8` }]}
      />
    </Sheet>
  );
}

/* ================= DT-02 ================= */
function PlantaInterior({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, cav, wall, sw, v2 } = g;
  const v: V = { ox: 70, oy: 92, s: 1 };
  const plan = masterPlan(version).filter((q) => (q.hidden && !["M3", "M4", "W3", "H1"].includes(q.id)) || ["SW1", "J1", "RV1"].includes(q.id));
  const board = L.board;
  const bw = board.xMax - board.xMin;
  const bx = (board.xMin + board.xMax) / 2;
  const by = (board.yMin + board.yMax) / 2;
  const wallRing: Seg[][] = [[...roundedSegs(box.xMin, box.xMax, box.yMin, box.yMax, p.cornerRadius), ...roundedSegs(cav.xMin, cav.xMax, cav.yMin, cav.yMax, p.cornerRadius - wall)]];
  const placed = (id: string) => plan.find((q) => q.id === id)!;
  const u1 = placed("U1");
  const r1 = placed("R1");
  const c1 = placed("C1");
  const d2 = v2 ? placed("D2") : null;
  return (
    <Sheet info={info(version, "DT-02", "Planta-mãe: interior da caixa (corte horizontal z = 20)", "总装平面图：盒内布置（水平剖切 z = 20）", "Conjunto 总成", "1:1", sheet, total)}>
      <Solid v={v} ds={wallRing} evenodd />
      {L.posts.map((q, i) => <Solid key={i} v={v} ds={[[...circleSegs(q.x, q.y, 4), ...circleSegs(q.x, q.y, p.pilotHole / 2)]]} evenodd />)}
      <Void v={v} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={box.yMin} w2={box.yMin + wall} open="tb" />
      {v2 && <Void v={v} u1={p.knobX - p.knobDiameter / 2} u2={p.knobX + p.knobDiameter / 2} w1={box.yMin} w2={box.yMin + wall} open="tb" />}
      {v2 && <Void v={v} u1={box.xMax - wall} u2={box.xMax} w1={p.jackY - p.jackDiameter / 2} w2={p.jackY + p.jackDiameter / 2} open="lr" />}
      <Circ v={v} u={0} w={0} r={12} c="hid" />
      <Circ v={v} u={0} w={0} r={L.ledPost.diameter / 2} fill="#eef1f6" />
      <Circ v={v} u={0} w={0} r={2.9} fill="#fffbe6" />
      <Rect v={v} u1={-1.6} u2={1.6} w1={L.ledPost.slot.dir > 0 ? 0 : -5.5} w2={L.ledPost.slot.dir > 0 ? 5.5 : 0} c="hid" />
      {L.cradle && <Rect v={v} u1={L.cradle.xMin} u2={L.cradle.xMax} w1={L.cradle.yMin} w2={L.cradle.yMax} fill="#eef1f6" />}
      {!v2 && <Rect v={v} u1={-p.batteryLength / 2} u2={p.batteryLength / 2} w1={p.batteryY - p.batteryWidth / 2} w2={p.batteryY + p.batteryWidth / 2} fill="#dde2ea" />}
      <Rect v={v} u1={board.xMin} u2={board.xMax} w1={board.yMin} w2={board.yMax} fill="#cdeedb" />
      {L.boardPosts.map((q, i) => (<g key={i}><Circ v={v} u={q.x} w={q.y} r={3.5} fill="#eef1f6" /><Circ v={v} u={q.x} w={q.y} r={2.8} fill="#c9ced6" /><Circ v={v} u={q.x} w={q.y} r={1.3} fill="#fff" /></g>))}
      <Rect v={v} u1={u1.x - 5} u2={u1.x + 5} w1={u1.y - 2.25} w2={u1.y + 2.25} fill="#2a2f38" />
      <Rect v={v} u1={r1.x - 3.15} u2={r1.x + 3.15} w1={r1.y - 1.15} w2={r1.y + 1.15} fill="#c9b27a" />
      <Rect v={v} u1={c1.x - 2.5} u2={c1.x + 2.5} w1={c1.y - 1.5} w2={c1.y + 1.5} fill="#d9a441" />
      {d2 && <Rect v={v} u1={d2.x - 2.6} u2={d2.x + 2.6} w1={d2.y - 1.35} w2={d2.y + 1.35} fill="#1d2027" />}
      <Rect v={v} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={box.yMin + wall} w2={box.yMin + wall + 10} c="hid" />
      {v2 && <Circ v={v} u={p.knobX} w={box.yMin + wall + 1} r={5} c="hid" />}
      {v2 && <Rect v={v} u1={box.xMax - wall - 10} u2={box.xMax - wall} w1={p.jackY - 4.9} w2={p.jackY + 4.9} c="hid" />}
      <Ctr v={v} u={0} w={0} len={16} />
      <DimH v={v} u1={box.xMin} u2={box.xMax} w={box.yMin} off={-8} />
      <DimV v={v} w1={box.yMin} w2={box.yMax} u={box.xMin} off={-9} />
      <DimH v={v} u1={board.xMin} u2={board.xMax} w={board.yMax} off={7} />
      <DimV v={v} w1={board.yMin} w2={board.yMax} u={board.xMax} off={9} />
      <Balloon v={v} at={[0, 0]} dx={v2 ? -2 : 20} dy={v2 ? 22 : -14} id="D1" />
      <Balloon v={v} at={[bx + bw / 2, by]} dx={13} dy={0} id="PCB1" />
      <Balloon v={v} at={[u1.x, u1.y]} dx={v2 ? -6 : -14} dy={v2 ? -18 : 28} id="U1" />
      <Balloon v={v} at={[r1.x, r1.y]} dx={6} dy={v2 ? 18 : 30} id="R1" />
      <Balloon v={v} at={[c1.x, c1.y]} dx={v2 ? 14 : 22} dy={v2 ? 16 : 22} id="C1" />
      <Balloon v={v} at={[sw.x, box.yMin + wall + 4]} dx={0} dy={-20} id="SW1" />
      <Balloon v={v} at={[L.posts[2]!.x, L.posts[2]!.y]} dx={16} dy={0} id="M1" />
      {v2 ? (
        <>
          <Balloon v={v} at={[d2!.x, d2!.y]} dx={-12} dy={22} id="D2" />
          <Balloon v={v} at={[p.knobX, box.yMin + wall + 2]} dx={0} dy={-20} id="RV1" />
          <Balloon v={v} at={[box.xMax - wall - 4, p.jackY]} dx={-12} dy={-16} id="J1" />
        </>
      ) : (
        <Balloon v={v} at={[p.batteryLength / 2 - 6, p.batteryY]} dx={14} dy={-8} id="BT1" />
      )}
      <ViewTitle x={v.ox + 40} y={152} text="Planta sem tampa e sem teto · 无底盖无顶板平面图" scale="1:1" />
      <g className="dt-table">
        <T className="dt-t dt-tnh" x={140} y={16}>Posição do centro de cada peça (mm) · 零件中心位置</T>
        <line className="dt-thin" x1={140} x2={290} y1={18.5} y2={18.5} />
        {["ID", "X", "Y", "Z", "Dimensão · 尺寸"].map((h, i) => <T key={h} className="dt-t dt-tl" x={[140, 156, 172, 188, 206][i]} y={22.5}>{h}</T>)}
        {plan.map((q, i) => (
          <g key={q.id}>
            <T className="dt-t dt-tv" x={140} y={28.5 + i * 5.2}>{q.id}</T>
            <T className="dt-t dt-tv" x={156} y={28.5 + i * 5.2}>{f(q.x)}</T>
            <T className="dt-t dt-tv" x={172} y={28.5 + i * 5.2}>{f(q.y)}</T>
            <T className="dt-t dt-tv" x={188} y={28.5 + i * 5.2}>{f(q.z)}</T>
            <T className="dt-t dt-tv" x={206} y={28.5 + i * 5.2}>{q.size.map(f).join(" × ")}</T>
          </g>
        ))}
        <T className="dt-t dt-tn" x={140} y={33 + plan.length * 5.2}>Origem: eixo do tubo, z = 0 no piso da caixa. · 原点：镜筒轴线，z = 0 为灯箱底面。</T>
        <T className="dt-t dt-tn" x={140} y={38 + plan.length * 5.2}>PCB1: {f(placed("PCB1").size[0])} × {f(placed("PCB1").size[1])} × 1,6 mm, face superior em z = {f(placed("PCB1").z + 0.8)}.</T>
        <T className="dt-t dt-tn" x={140} y={43 + plan.length * 5.2}>Fios: ver DT-03 e a ordem das ligações (seção 4). · 导线见 DT-03 与第 4 节。</T>
      </g>
    </Sheet>
  );
}

/* ================= DT-03 ================= */
function CorteLongitudinal({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, cav, wall, col, tube } = g;
  const v: V = { ox: 88, oy: 146, s: 1, fx: -1 };
  const zCut = 100;
  const seat = L.diffuserSeat;
  const post = L.ledPost;
  const slideTop = L.samplePlane;
  const roofTop = box.height;
  const dir = post.slot.dir;
  const pcbY = version === "v1" ? [-31.5, -6.5] : [25.5, 50.5];
  const board = L.board;
  const d: V = { ox: 234, oy: 220, s: 3.5 };
  return (
    <Sheet info={info(version, "DT-03", "Planta-mãe: corte longitudinal A–A (x = 0) e pilha óptica", "总装剖视图 A–A（x = 0）与光学叠层", "Conjunto 总成", "1:1 · 3,5:1", sheet, total)}>
      <Solid v={v} ds={[shellSegs(g), rectSegs(box.yMin, box.yMax, -wall, 0), profileSegs(g, zCut)]} />
      <Void v={v} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w1={cav.top} w2={roofTop} open="tb" />
      <Void v={v} u1={-seat.diameter / 2} u2={seat.diameter / 2} w1={cav.top} w2={seat.top} open="b" />
      <Void v={v} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w1={roofTop - p.channelDepth} w2={roofTop} open="t" />
      <Void v={v} u1={col.yMin} u2={col.yMax} w1={L.columnWindow!.zMin} w2={zCut} open="lrt" />
      <Solid v={v} ds={[rectSegs(-post.diameter / 2, post.diameter / 2, -0.2, post.top)]} />
      <Void v={v} u1={-post.seatDiameter / 2} u2={post.seatDiameter / 2} w1={post.top - post.seatDepth} w2={post.top} open="t" />
      <Void v={v} u1={-post.legHole / 2} u2={post.legHole / 2} w1={1} w2={post.top - post.seatDepth} />
      <Void v={v} u1={dir > 0 ? 0 : -(post.diameter / 2 + 1)} u2={dir > 0 ? post.diameter / 2 + 1 : 0} w1={0} w2={post.slot.height} open="b" />
      <Rect v={v} u1={-2.5} u2={2.5} w1={post.top - post.seatDepth + 1.5} w2={post.ledTop - 2.5} fill="#fffbe6" />
      <Shape v={v} segs={[["M", -2.5, post.ledTop - 2.5], ["A", 2.5, 2.5, post.ledTop - 2.5, 0], ["Z"]]} fill="#fffbe6" />
      <Solid v={v} ds={[rectSegs(-p.diffuserDiameter / 2, p.diffuserDiameter / 2, 37.8, 38.6)]} />
      <Solid v={v} ds={[rectSegs(-13, 13, slideTop - 1, slideTop)]} />
      <Shape v={v} segs={objectiveSegs(tube.noseZ)} fill="#f6e7c8" />
      <Rect v={v} u1={-tube.sleeveRadius} u2={tube.sleeveRadius} w1={tube.sleeveBottom} w2={tube.bottom} fill="#e5e9f0" />
      <Rect v={v} u1={-tube.radius} u2={tube.radius} w1={tube.bottom} w2={zCut} fill="#eef1f6" />
      {version === "v1" && L.cradle && (
        <>
          <Solid v={v} ds={[rectSegs(L.cradle.yMin, L.cradle.yMin + p.cradleWall, 0, L.cradle.height), rectSegs(L.cradle.yMax - p.cradleWall, L.cradle.yMax, 0, L.cradle.height)]} />
          <Rect v={v} u1={p.batteryY - p.batteryWidth / 2} u2={p.batteryY + p.batteryWidth / 2} w1={0} w2={17.5} fill="#dde2ea" />
        </>
      )}
      <Rect v={v} u1={pcbY[0]!} u2={pcbY[1]!} w1={board.standoffHeight} w2={board.standoffHeight + 1.6} fill="#cdeedb" />
      <Line v={v} a={[0, zCut]} b={[0, -4]} c="ctr" />
      <Line v={v} a={[-tube.radius - 2, zCut]} b={[tube.radius + 2, zCut]} c="thin" />
      <DimH v={v} u1={box.yMin} u2={box.yMax} w={-wall} off={-7} />
      <DimV v={v} w1={0} w2={roofTop} u={box.yMin} off={10} />
      <DimV v={v} w1={0} w2={post.top} u={-post.diameter / 2} off={-14} u2={post.diameter / 2} text={`${f(post.top)} (poste)`} />
      <Balloon v={v} at={[60, 20]} dx={-12} dy={-12} id="M1" />
      <Balloon v={v} at={[-38, -1.2]} dx={8} dy={14} id="M3" />
      <Balloon v={v} at={[0, post.ledTop - 3]} dx={14} dy={-18} id="D1" />
      <Balloon v={v} at={[(pcbY[0]! + pcbY[1]!) / 2, board.standoffHeight + 0.8]} dx={0} dy={18} id="PCB1" />
      <Balloon v={v} at={[-tube.objectiveRadius, 70]} dx={14} dy={0} id="P9" />
      {version === "v1" && <Balloon v={v} at={[p.batteryY, 17.5]} dx={0} dy={-22} id="BT1" />}
      <CutMark v={v} a={[box.yMax + 8, 58]} b={[box.yMin - 8, 58]} letter="H" dir={[0, 1]} />
      <ViewTitle x={v.ox - 8} y={162} text="Corte A–A · 剖视 A–A" scale="1:1" />
      <Solid v={d} ds={[rectSegs(-18, 18, cav.top, roofTop)]} />
      <Void v={d} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w1={cav.top} w2={roofTop} open="tb" />
      <Void v={d} u1={-seat.diameter / 2} u2={seat.diameter / 2} w1={cav.top} w2={seat.top} open="b" />
      <Void v={d} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w1={roofTop - p.channelDepth} w2={roofTop} open="t" />
      <Solid v={d} ds={[rectSegs(-p.diffuserDiameter / 2, p.diffuserDiameter / 2, 37.8, 38.6)]} />
      <Solid v={d} ds={[rectSegs(-15, 15, slideTop - 1, slideTop)]} />
      <Shape v={d} segs={objectiveSegs(tube.noseZ, 2.8)} fill="#f6e7c8" />
      <Rect v={d} u1={-2.9} u2={2.9} w1={31} w2={33.1} fill="#fffbe6" />
      <Shape v={d} segs={[["M", -2.5, 33.1], ["A", 2.5, 2.5, 33.1, 0], ["Z"]]} fill="#fffbe6" />
      <DimV v={d} w1={post.ledTop} w2={cav.top} u={-18} off={-8} text={f(cav.top - post.ledTop)} />
      <DimV v={d} w1={cav.top} w2={roofTop} u={-18} off={-8} text={f(wall)} />
      <DimV v={d} w1={slideTop} w2={tube.noseZ} u={tube.objectiveRadius} off={14} text="0,8" />
      <DimH v={d} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w={roofTop} off={9} text={`janela ⌀${f(p.ledWindowDiameter)}`} />
      <DimH v={d} u1={-seat.diameter / 2} u2={seat.diameter / 2} w={cav.top} off={-9} text={`assento ⌀${f(seat.diameter)} (*)`} />
      <DimH v={d} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w={roofTop} off={19} text={`canal ${f(p.slideWidth + p.slideFit)} (*)`} />
      <Balloon v={d} at={[-13, 38.2]} dx={-10} dy={14} id="M4" />
      <Balloon v={d} at={[-15, slideTop - 0.5]} dx={-10} dy={-12} id="L1" />
      <Balloon v={d} at={[8, 43]} dx={14} dy={-6} id="P9" />
      <Balloon v={d} at={[0, 34]} dx={-14} dy={20} id="D1" />
      <ViewTitle x={d.ox} y={152} text="Detalhe H: pilha óptica · 局部详图 H" scale="3,5:1" />
      <g className="dt-table">
        <T className="dt-t dt-tnh" x={160} y={16}>Pilha óptica (de baixo para cima) · 光学叠层（自下而上）</T>
        <line className="dt-thin" x1={160} x2={290} y1={18.5} y2={18.5} />
        {[
          ["LED D1 (topo)", `z = ${f(post.ledTop)}`],
          ["Difusor M4", "z = 37,8–38,6"],
          ["Face superior do teto", `z = ${f(roofTop)}`],
          ["Lâmina L1 (topo)", `z = ${f(slideTop)}`],
          ["Lente da objetiva P9", `z = ${f(tube.noseZ)}`],
          ["Distância de trabalho", `${f(p.workingDistance)} mm`],
          ["Objetiva P9 (total / abaixo do tubo)", `${f(p.objectiveLength + 3)} / ${f(p.objectiveLength)} mm`],
        ].map(([a, b], i) => (
          <g key={a}><T className="dt-t dt-tv" x={160} y={25 + i * 5.4}>{a}</T><T className="dt-t dt-tv" x={250} y={25 + i * 5.4}>{b}</T></g>
        ))}
      </g>
    </Sheet>
  );
}

/* ================= DT-04 ================= */
function M1Externa({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, R, bore, earX, earHalf, box, cav, col, ring, sw, wall } = g;
  const s = 1 / 3;
  const front: V = { ox: 66, oy: 100, s };
  const side: V = { ox: 176, oy: 100, s, fx: -1 };
  const top: V = { ox: 258, oy: 66, s: 0.5 };
  const win = L.columnWindow!;
  return (
    <Sheet info={info(version, "DT-04", "M1 Suporte: vistas externas", "M1 支架：外形视图", "M1", "1:3 · 1:2", sheet, total)}>
      <Rect v={front} u1={box.xMin} u2={box.xMax} w1={0} w2={box.height} r={1.5} />
      <Rect v={front} u1={-22} u2={22} w1={col.bottom} w2={col.top} />
      <Shape v={front} segs={stadiumSegs(-win.width / 2, win.width / 2, win.zMin, win.zMax)} />
      <Rect v={front} u1={-R} u2={R} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={-bore} u2={bore} w1={ring.bottom} w2={ring.top} c="hid" />
      <Rect v={front} u1={earX - earHalf} u2={earX + earHalf} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={-earX - earHalf} u2={-earX + earHalf} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={20 - sw.height / 2} w2={20 + sw.height / 2} />
      {g.v2 && <Circ v={front} u={p.knobX} w={20} r={p.knobDiameter / 2} />}
      <Line v={front} a={[0, -4]} b={[0, col.top + 6]} c="ctr" />
      <DimV v={front} w1={0} w2={col.top} u={-45} off={-14} />
      <DimV v={front} w1={0} w2={box.height} u={45} off={8} />
      <DimV v={front} w1={win.zMin} w2={win.zMax} u={22} off={12} text={`janela ${f(win.zMax - win.zMin)}`} />
      <DimV v={front} w1={ring.bottom} w2={ring.top} u={earX + earHalf} off={8} />
      <DimV v={front} w1={0} w2={win.zMin} u={-22} off={-8} text={f(win.zMin)} />
      <DimH v={front} u1={-win.width / 2} u2={win.width / 2} w={win.zMin} off={-5} text={f(win.width)} />
      <DimH v={front} u1={-earX - earHalf} u2={earX + earHalf} w={col.top} off={9} />
      <DimH v={front} u1={-45} u2={45} w={0} off={-7} />
      <Lead v={front} at={[sw.x - sw.width / 2, 24]} dx={-8} dy={-14} text={`recorte ${f(sw.width)} × ${f(sw.height)} (*)`} />
      <DimH v={front} u1={0} u2={sw.x} w={20 - sw.height / 2} off={-3} text={f(Math.abs(sw.x))} />
      {g.v2 && <Lead v={front} at={[p.knobX + 3, 22]} dx={10} dy={-12} text={`⌀${f(p.knobDiameter)} (*), x = ${f(p.knobX)}`} />}
      <ViewTitle x={front.ox} y={118} text="Vista frontal · 正视图" scale="1:3" />
      <Rect v={side} u1={box.yMin} u2={box.yMax} w1={0} w2={box.height} r={1.5} />
      <Shape v={side} segs={profileSegs(g, col.top)} />
      <Rect v={side} u1={col.yMin} u2={col.yMax} w1={win.zMin} w2={win.zMax} c="hid" />
      <Rect v={side} u1={0} u2={8} w1={ring.top - 11 - 1.3} w2={ring.top - 11 + 1.3} c="hid" />
      <DimH v={side} u1={box.yMin} u2={box.yMax} w={0} off={-7} />
      <DimH v={side} u1={col.yMin} u2={col.yMax} w={col.top} off={6} text={f(p.columnDepth)} />
      <DimH v={side} u1={0} u2={col.yMin + 0.5} w={ring.bottom} off={-5} text={f(col.yMin + 0.5)} />
      <DimV v={side} w1={0} w2={col.top} u={col.yMax} off={-14} />
      <DimV v={side} w1={ring.bottom} w2={ring.top} u={0} off={9} text={f(p.ringHeight)} />
      <Lead v={side} at={[col.yMax - 2.3, col.top - 2.3]} dx={-12} dy={-9} text={`R${f(p.columnRound)}`} />
      <Lead v={side} at={[col.yMin - 2.3, ring.bottom - 6]} dx={12} dy={12} text={`R${f(p.columnRound)}`} />
      <Lead v={side} at={[4, ring.top - 11]} dx={20} dy={26} text={`2× piloto ⌀${f(p.pilotHole)} × 8 (*)`} />
      <ViewTitle x={side.ox - 10} y={118} text="Vista lateral esquerda · 左视图" scale="1:3" />
      <Rect v={top} u1={box.xMin} u2={box.xMax} w1={box.yMin} w2={box.yMax} r={p.cornerRadius} />
      <Rect v={top} u1={cav.xMin} u2={cav.xMax} w1={cav.yMin} w2={cav.yMax} r={p.cornerRadius - wall} c="hid" />
      <Rect v={top} u1={-22} u2={22} w1={col.yMin} w2={col.yMax} />
      <Rect v={top} u1={-22} u2={22} w1={0} w2={col.yMin} />
      <Circ v={top} u={0} w={0} r={bore} />
      <Circ v={top} u={0} w={0} r={p.ledWindowDiameter / 2} />
      <Circ v={top} u={0} w={0} r={L.diffuserSeat.diameter / 2} c="hid" />
      <Rect v={top} u1={-earX - earHalf} u2={-earX + earHalf} w1={0} w2={10} />
      <Rect v={top} u1={earX - earHalf} u2={earX + earHalf} w1={0} w2={10} />
      <Rect v={top} u1={box.xMin} u2={box.xMax} w1={-(p.slideWidth + p.slideFit) / 2} w2={(p.slideWidth + p.slideFit) / 2} c="hid" />
      {L.posts.map((q, i) => <Circ key={i} v={top} u={q.x} w={q.y} r={4} c="hid" />)}
      <Ctr v={top} u={0} w={0} len={30} />
      <DimH v={top} u1={box.xMin} u2={box.xMax} w={box.yMin} off={-6} />
      <DimV v={top} w1={box.yMin} w2={box.yMax} u={box.xMin} off={-8} />
      <DimV v={top} w1={col.yMin} w2={col.yMax} u={22} off={8} text={f(p.columnDepth)} />
      <DimH v={top} u1={-22} u2={22} w={col.yMax} off={6} text={f(p.columnWidth)} />
      <Lead v={top} at={[-box.xMax + 2, box.yMin + 2]} dx={-8} dy={8} text={`R${f(p.cornerRadius)}`} />
      <ViewTitle x={top.ox} y={114} text="Vista superior · 俯视图" scale="1:2" />
      <Block
        x={8}
        y={134}
        head="Recortes principais · 主要开孔"
        lines={[
          { t: `janela do LED ⌀${f(p.ledWindowDiameter)} · assento do difusor ⌀${f(L.diffuserSeat.diameter)} (*) · canal da lâmina ${f(p.slideWidth + p.slideFit)} (*) × ${f(p.channelDepth)}` },
          { t: `furo do anel ⌀${f(bore * 2)} (*) · janela da coluna ${f(p.windowWidth)} × ${f(win.zMax - win.zMin)} · recorte SW1 ${f(sw.width)} × ${f(sw.height)} (*)` },
          { t: "LED 光窗、扩散片凹槽、载玻片槽、环孔、立柱窗口、开关开孔（带 (*) 的尺寸待校准）。详见 DT-05 / DT-06。", zh: true },
        ]}
      />
    </Sheet>
  );
}

/* ================= DT-05 ================= */
function M1Cortes({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, cav, wall, col, ring, sw } = g;
  const win = L.columnWindow!;
  const seat = L.diffuserSeat;
  const a: V = { ox: 88, oy: 134, s: 0.5, fx: -1 };
  const b: V = { ox: 214, oy: 88, s: 1 };
  const roofTop = box.height;
  const ring2: Seg[] = [...roundedSegs(box.xMin, box.xMax, box.yMin, box.yMax, p.cornerRadius), ...roundedSegs(cav.xMin, cav.xMax, cav.yMin, cav.yMax, p.cornerRadius - wall)];
  return (
    <Sheet info={info(version, "DT-05", "M1 Suporte: cortes A–A e B–B", "M1 支架：剖视 A–A 与 B–B", "M1", "1:2 · 1:1", sheet, total)}>
      <Solid v={a} ds={[shellSegs(g), profileSegs(g, col.top)]} />
      <Void v={a} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w1={cav.top} w2={roofTop} open="tb" />
      <Void v={a} u1={-seat.diameter / 2} u2={seat.diameter / 2} w1={cav.top} w2={seat.top} open="b" />
      <Void v={a} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w1={roofTop - p.channelDepth} w2={roofTop} open="t" />
      <Void v={a} u1={col.yMin} u2={col.yMax} w1={win.zMin} w2={win.zMax} open="lr" />
      <Line v={a} a={[0, col.top + 8]} b={[0, -4]} c="ctr" />
      <DimV v={a} w1={0} w2={col.top} u={box.yMin} off={-10} />
      <DimV v={a} w1={win.zMin} w2={win.zMax} u={col.yMax} off={-10} text={`janela ${f(win.zMax - win.zMin)}`} />
      <DimV v={a} w1={0} w2={win.zMin} u={col.yMax} off={-24} />
      <DimV v={a} w1={ring.bottom} w2={ring.top} u={g.bore} off={12} text={f(p.ringHeight)} />
      <DimH v={a} u1={box.yMin} u2={box.yMax} w={0} off={-7} />
      <DimH v={a} u1={col.yMin} u2={col.yMax} w={col.top} off={6} />
      <DimH v={a} u1={-g.bore} u2={g.bore} w={ring.top} off={14} text={`furo ⌀${f(g.bore * 2)} (*)`} />
      <Lead v={a} at={[col.yMin - 4, ring.bottom - 6]} dx={20} dy={10} text={`R${f(p.columnRound)}`} />
      <CutMark v={a} a={[box.yMax + 10, 20]} b={[box.yMin - 10, 20]} letter="B" dir={[0, 1]} />
      <ViewTitle x={a.ox - 6} y={146} text="Corte A–A (x = 0) · 剖视 A–A" scale="1:2" />
      <Block x={30} y={156} lines={[{ t: "Teto, assento do difusor e canal: detalhe H (DT-03) e detalhe G (DT-09). · 顶板详见 DT-03、DT-09。" }]} />
      <Solid v={b} ds={[ring2]} evenodd />
      {L.posts.map((q, i) => <Solid key={i} v={b} ds={[[...circleSegs(q.x, q.y, 4), ...circleSegs(q.x, q.y, p.pilotHole / 2)]]} evenodd />)}
      <Void v={b} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={box.yMin} w2={box.yMin + wall} open="tb" />
      {g.v2 && <Void v={b} u1={p.knobX - p.knobDiameter / 2} u2={p.knobX + p.knobDiameter / 2} w1={box.yMin} w2={box.yMin + wall} open="tb" />}
      {g.v2 && <Void v={b} u1={box.xMax - wall} u2={box.xMax} w1={p.jackY - p.jackDiameter / 2} w2={p.jackY + p.jackDiameter / 2} open="lr" />}
      <Ctr v={b} u={0} w={0} len={6} />
      <DimH v={b} u1={box.xMin} u2={box.xMax} w={box.yMin} off={-7} />
      <DimV v={b} w1={box.yMin} w2={box.yMax} u={box.xMax} off={9} />
      <DimV v={b} w1={L.posts[0]!.y} w2={L.posts[1]!.y} u={L.posts[0]!.x} off={-8} />
      {g.v2 && <DimV v={b} w1={p.jackY - p.jackDiameter / 2} w2={p.jackY + p.jackDiameter / 2} u={box.xMax} off={-14} text={`⌀${f(p.jackDiameter)} (*)`} />}
      <Lead v={b} at={[L.posts[3]!.x + 4, L.posts[3]!.y]} dx={-3} dy={-12} text={`4× ⌀8, piloto ⌀${f(p.pilotHole)} (*)`} />
      <CutMark v={b} a={[0, box.yMax + 5]} b={[0, box.yMin - 8]} letter="A" dir={[1, 0]} />
      <ViewTitle x={b.ox} y={160} text="Corte B–B (z = 20) · 剖视 B–B" scale="1:1" />
    </Sheet>
  );
}

/* ================= DT-06 ================= */
function M1Detalhes({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, R, bore, earX, earHalf, ring, arm, sw, box } = g;
  const v: V = { ox: 86, oy: 128, s: 2 };
  const armLen = arm.yMax;
  const rows: [string, string, string][] = [
    ["Janela do LED", `⌀${f(p.ledWindowDiameter)} passante no teto`, "(0 ; 0)"],
    ["Assento do difusor", `⌀${f(L.diffuserSeat.diameter)} (*), por dentro do teto`, "(0 ; 0)"],
    ["Canal da lâmina", `${f(p.slideWidth + p.slideFit)} (*) × ${f(p.channelDepth)} prof., em x`, "y = 0"],
    ["Recorte SW1", `${f(sw.width)} × ${f(sw.height)} (*), parede frontal`, `x = ${f(sw.x)} ; z = ${f(box.height / 2)}`],
    ...(g.v2 ? ([["Furo J1", `⌀${f(p.jackDiameter)} (*), parede direita`, `y = ${f(p.jackY)} ; z = ${f(box.height / 2)}`], ["Furo RV1", `⌀${f(p.knobDiameter)} (*), parede frontal`, `x = ${f(p.knobX)} ; z = ${f(box.height / 2)}`]] as [string, string, string][]) : []),
    ["Janela da coluna", `${f(p.windowWidth)} × ${f(L.columnWindow!.zMax - L.columnWindow!.zMin)}, passante em y`, `z = ${f(L.columnWindow!.zMin)} a ${f(L.columnWindow!.zMax)}`],
    ["Postes da tampa", `4× ⌀8, piloto ⌀${f(p.pilotHole)} (*)`, `x = ±${f(L.posts[2]!.x)} ; y = ${f(L.posts[0]!.y)} e ${f(L.posts[1]!.y)}`],
    ["Piloto da abraçadeira", `2× ⌀${f(p.pilotHole)} (*) × 8 de prof., em y`, `x = ±${f(earX)} ; z = ${f(ring.bottom + p.ringHeight / 2)}`],
  ];
  return (
    <Sheet info={info(version, "DT-06", "M1: detalhe do anel e recortes", "M1 支架：抱箍环详图与开孔表", "M1", "2:1", sheet, total)}>
      <Solid v={v} ds={[rectSegs(-22, 22, 0, armLen), rectSegs(earX - earHalf, earX + earHalf, 0, 10), rectSegs(-earX - earHalf, -earX + earHalf, 0, 10)]} />
      <VoidShape v={v} segs={[["M", -bore, 0], ["A", bore, bore, 0, 1], ["Z"]]} />
      <Void v={v} u1={earX - 1.3} u2={earX + 1.3} w1={-0.5} w2={8} open="b" />
      <Void v={v} u1={-earX - 1.3} u2={-earX + 1.3} w1={-0.5} w2={8} open="b" />
      <Line v={v} a={[0, -6]} b={[0, armLen + 4]} c="ctr" />
      <Line v={v} a={[earX, -6]} b={[earX, 14]} c="ctr" />
      <Line v={v} a={[-earX, -6]} b={[-earX, 14]} c="ctr" />
      <Line v={v} a={[-34, 0]} b={[34, 0]} c="thin" />
      <DimH v={v} u1={-bore} u2={bore} w={0} off={-8} text={`⌀${f(bore * 2)} (*)`} />
      <DimH v={v} u1={-earX - earHalf} u2={earX + earHalf} w={0} off={-18} />
      <DimH v={v} u1={-earX} u2={earX} w={armLen} off={6} text={`${f(earX * 2)} (entre eixos)`} />
      <DimH v={v} u1={-22} u2={22} w={armLen} off={16} />
      <DimV v={v} w1={0} w2={10} u={-earX - earHalf} off={-8} text={f(10)} />
      <DimV v={v} w1={0} w2={armLen} u={22} off={10} text={f(armLen)} />
      <DimH v={v} u1={earX - earHalf} u2={earX + earHalf} w={10} off={6} text={f(earHalf * 2)} />
      <Lead v={v} at={[earX, 4]} dx={12} dy={20} text={`piloto ⌀${f(p.pilotHole)} (*) × 8`} />
      <Lead v={v} at={[-R, 6]} dx={-8} dy={-16} text={`R ext. ${f(R)}`} dot={false} />
      <ViewTitle x={v.ox} y={150} text="Detalhe E: planta do anel em z = 199,2 · 局部详图 E" scale="2:1" />
     <g className="dt-table">
        <T className="dt-t dt-tnh" x={160} y={16}>Tabela de recortes e furos do M1 · M1 开孔表</T>
        <line className="dt-thin" x1={160} x2={290} y1={18.5} y2={18.5} />
        {rows.map(([a, b, c], i) => (
          <g key={a}>
            <T className="dt-t dt-tv" x={160} y={25 + i * 12.5}>{a}</T>
            <T className="dt-t dt-tn" x={160} y={29.6 + i * 12.5}>{b}</T>
            <T className="dt-t dt-tn dt-tzh" x={160} y={33.6 + i * 12.5}>{c}</T>
          </g>
        ))}
        <T className="dt-t dt-tn" x={160} y={160}>(*) a confirmar com os gabaritos G1 a G3. · 以校准件 G1~G3 核实。</T>
      </g>
    </Sheet>
  );
}

/* ================= DT-07 ================= */
function M2Abracadeira({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { p, R, bore, earX, earHalf, ring } = g;
  const gap = ring.gap;
  const zc = ring.bottom + p.ringHeight / 2;
  const front: V = { ox: 90, oy: 44 + ring.top * 2, s: 2 };
  const plan: V = { ox: 90, oy: 108, s: 2 };
  const chord = Math.sqrt(R * R - gap * gap);
  const chordIn = Math.sqrt(bore * bore - gap * gap);
  const cap: Seg[] = [["M", -chord, -gap], ["A", R, chord, -gap, 0], ["L", chordIn, -gap], ["A", bore, -chordIn, -gap, 1], ["Z"]];
  const ear = (sx: 1 | -1) => rectSegs(sx * earX - earHalf, sx * earX + earHalf, -gap - 10, -gap + 0.5);
  return (
    <Sheet info={info(version, "DT-07", "M2 Abraçadeira do tubo (metade removível)", "M2 镜筒抱箍（可拆半环）", "M2", "2:1", sheet, total)}>
      <Rect v={front} u1={-R} u2={R} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={earX - earHalf} u2={earX + earHalf} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={-earX - earHalf} u2={-earX + earHalf} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={-bore} u2={bore} w1={ring.bottom} w2={ring.top} c="hid" />
      <Circ v={front} u={earX} w={zc} r={p.screwHole / 2} />
      <Circ v={front} u={-earX} w={zc} r={p.screwHole / 2} />
      <Ctr v={front} u={earX} w={zc} len={5} />
      <Ctr v={front} u={-earX} w={zc} len={5} />
      <Line v={front} a={[0, ring.bottom - 3]} b={[0, ring.top + 3]} c="ctr" />
      <DimH v={front} u1={-earX - earHalf} u2={earX + earHalf} w={ring.top} off={8} />
      <DimV v={front} w1={ring.bottom} w2={ring.top} u={-earX - earHalf} off={-9} text={f(p.ringHeight)} />
      <Lead v={front} at={[earX, zc]} dx={14} dy={-16} text={`2× ⌀${f(p.screwHole)} passante · entre eixos ${f(earX * 2)}`} />
      <CutMark v={front} a={[-earX - earHalf - 8, zc]} b={[earX + earHalf + 8, zc]} letter="C" dir={[0, -1]} />
      <ViewTitle x={front.ox} y={92} text="Vista frontal · 正视图" scale="2:1" />
      <Solid v={plan} ds={[cap, ear(1), ear(-1)]} />
      <VoidShape v={plan} segs={rectSegs(earX - p.screwHole / 2, earX + p.screwHole / 2, -gap - 11, -gap + 1)} />
      <VoidShape v={plan} segs={rectSegs(-earX - p.screwHole / 2, -earX + p.screwHole / 2, -gap - 11, -gap + 1)} />
      <Line v={plan} a={[-34, 0]} b={[34, 0]} c="thin" />
      <Line v={plan} a={[0, 4]} b={[0, -R - 4]} c="ctr" />
      <Line v={plan} a={[earX, -gap + 2]} b={[earX, -gap - 14]} c="ctr" />
      <Line v={plan} a={[-earX, -gap + 2]} b={[-earX, -gap - 14]} c="ctr" />
      <DimH v={plan} u1={-bore} u2={bore} w={-gap} off={-4} text={`⌀${f(bore * 2)} (*)`} />
      <DimH v={plan} u1={-R} u2={-bore} w={-gap} off={8} text={f(p.ringWall)} />
      <DimV v={plan} w1={-gap - 10} w2={-gap} u={earX + earHalf} off={9} text={f(10)} />
      <DimH v={plan} u1={earX - earHalf} u2={earX + earHalf} w={-gap - 10} off={-6} text={f(earHalf * 2)} />
      <Lead v={plan} at={[0, -R]} dx={22} dy={4} text={`R ext. ${f(R)}`} />
      <ViewTitle x={plan.ox} y={160} text="Corte C–C (z = 199,2) · 剖视 C–C" scale="2:1" />
      <Block
        x={168}
        y={96}
        head="Orientação de impressão · 打印方向"
        lines={[
          { t: "Arquivo abracadeira-tubo-impressao.stl (abre para cima), sem suportes." },
          { t: "使用 abracadeira-tubo-impressao.stl（开口朝上），无需支撑。", zh: true },
        ]}
      />
      <Block
        x={168}
        y={116}
        head="Montagem · 装配"
        lines={[
          { t: `2× parafuso M3 × 16 (H2) atravessam as orelhas e entram 8 mm no piloto ⌀${f(p.pilotHole)} do M1.` },
          { t: `Folga de ${f(gap)} mm entre as metades. · 两半环间隙 ${f(gap)} mm。`, zh: true },
        ]}
      />
      <Block
        x={168}
        y={138}
        head="Furo do tubo · 镜筒孔"
        lines={[{ t: `⌀${f(bore * 2)} (*) = tubo medido ${f(p.tubeDiameter)} + folga ${f(p.boreClearance)}.` }, { t: "Confirmar no gabarito G1 antes de imprimir em série." }]}
      />
    </Sheet>
  );
}

/* ================= DT-08 ================= */
function M3Tampa({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, wall } = g;
  const post = L.ledPost;
  const plan: V = { ox: 66, oy: 100, s: 1 };
  const cc: V = { ox: 214, oy: 108, s: 1, fx: -1 };
  const dd: V = { ox: 214, oy: 146, s: 1 };
  const board = L.board;
  const bpy = (board.yMin + board.yMax) / 2;
  const rowsH: [string, string, string][] = [
    ["Furos da tampa (H1)", `4× ⌀${f(p.screwHole)}`, `x = ±${f(L.lid.holes[2]!.x)} ; y = ${f(L.lid.holes[0]!.y)} / ${f(L.lid.holes[1]!.y)}`],
    ["Postes da placa (H3)", `4× ⌀7, piloto ⌀${f(p.pilotHole)} (*), h = ${f(board.standoffHeight)}`, `x = ${f(L.boardPosts[0]!.x)} / ${f(L.boardPosts[2]!.x)} ; y = ${f(L.boardPosts[0]!.y)} / ${f(L.boardPosts[1]!.y)}`],
    ["Porta-LED (D1)", `⌀${f(post.diameter)}, h = ${f(post.top)}`, "(0 ; 0)"],
    ["Assento do flange", `⌀${f(post.seatDiameter)} (*) × ${f(post.seatDepth)}`, "(0 ; 0)"],
    ["Furo das pernas", `⌀${f(post.legHole)} cego + fenda ${f(post.legHole)} × ${f(post.diameter / 2 + 1)} × ${f(post.slot.height)}`, post.slot.dir > 0 ? "fenda para +y" : "fenda para −y"],
    ...(L.cradle ? ([["Berço da pilha", `${f(L.cradle.xMax - L.cradle.xMin)} × ${f(L.cradle.yMax - L.cradle.yMin)}, h = ${f(L.cradle.height)}, parede ${f(p.cradleWall)}`, `centro (0 ; ${f(p.batteryY)})`]] as [string, string, string][]) : []),
  ];
  const slotU = post.slot.dir > 0 ? post.diameter / 2 + 1 : -(post.diameter / 2 + 1);
  return (
    <Sheet info={info(version, "DT-08", "M3 Tampa de fundo", "M3 底盖", "M3", "1:1", sheet, total)}>
      <Shape v={plan} segs={roundedSegs(box.xMin, box.xMax, box.yMin, box.yMax, p.cornerRadius)} />
      {L.cradle && <Rect v={plan} u1={L.cradle.xMin} u2={L.cradle.xMax} w1={L.cradle.yMin} w2={L.cradle.yMax} />}
      {L.cradle && <Rect v={plan} u1={L.cradle.xMin + p.cradleWall} u2={L.cradle.xMax - p.cradleWall} w1={L.cradle.yMin + p.cradleWall} w2={L.cradle.yMax - p.cradleWall} />}
      {L.lid.holes.map((h, i) => <g key={i}><Circ v={plan} u={h.x} w={h.y} r={p.screwHole / 2} /><Ctr v={plan} u={h.x} w={h.y} len={4} /></g>)}
      {L.boardPosts.map((q, i) => <g key={i}><Circ v={plan} u={q.x} w={q.y} r={3.5} /><Circ v={plan} u={q.x} w={q.y} r={p.pilotHole / 2} /><Ctr v={plan} u={q.x} w={q.y} len={5} /></g>)}
      <Circ v={plan} u={0} w={0} r={post.diameter / 2} />
      <Circ v={plan} u={0} w={0} r={post.seatDiameter / 2} />
      <Circ v={plan} u={0} w={0} r={post.legHole / 2} />
      <Rect v={plan} u1={-post.legHole / 2} u2={post.legHole / 2} w1={post.slot.dir > 0 ? 0 : -(post.diameter / 2 + 1)} w2={post.slot.dir > 0 ? post.diameter / 2 + 1 : 0} c="hid" />
      <Rect v={plan} u1={board.xMin} u2={board.xMax} w1={board.yMin} w2={board.yMax} c="hid" />
      <Ctr v={plan} u={0} w={0} len={9} />
      <DimH v={plan} u1={box.xMin} u2={box.xMax} w={box.yMin} off={-8} />
      <DimV v={plan} w1={box.yMin} w2={box.yMax} u={box.xMin} off={-9} />
      <DimH v={plan} u1={L.lid.holes[0]!.x} u2={L.lid.holes[2]!.x} w={L.lid.holes[0]!.y} off={-4} text={f(L.lid.holes[2]!.x * 2)} />
      <DimV v={plan} w1={L.lid.holes[0]!.y} w2={L.lid.holes[1]!.y} u={L.lid.holes[2]!.x} off={8} text={f(L.lid.holes[1]!.y - L.lid.holes[0]!.y)} />
      <DimH v={plan} u1={L.boardPosts[0]!.x} u2={L.boardPosts[2]!.x} w={L.boardPosts[0]!.y} off={-4} text={f(L.boardPosts[2]!.x - L.boardPosts[0]!.x)} />
      <DimV v={plan} w1={L.boardPosts[0]!.y} w2={L.boardPosts[1]!.y} u={L.boardPosts[0]!.x} off={-8} text={f(L.boardPosts[1]!.y - L.boardPosts[0]!.y)} />
      {L.cradle && <DimV v={plan} w1={L.cradle.yMin} w2={L.cradle.yMax} u={L.cradle.xMax} off={8} text={f(L.cradle.yMax - L.cradle.yMin)} />}
      {L.cradle && <DimH v={plan} u1={L.cradle.xMin} u2={L.cradle.xMax} w={L.cradle.yMax} off={6} text={f(L.cradle.xMax - L.cradle.xMin)} />}
      <Lead v={plan} at={[post.diameter / 2, 3]} dx={10} dy={-10} text={`⌀${f(post.diameter)} · ⌀${f(post.seatDiameter)} (*)`} />
      <Lead v={plan} at={[board.xMax, board.yMax]} dx={8} dy={-8} text="PCB1" dot={false} />
      <Lead v={plan} at={[box.xMin + 4, box.yMin + 4]} dx={-6} dy={14} text={`R${f(p.cornerRadius)}`} />
      <CutMark v={plan} a={[0, box.yMax + 6]} b={[0, box.yMin - 8]} letter="C" dir={[-1, 0]} />
      <CutMark v={plan} a={[box.xMin - 8, bpy]} b={[box.xMax + 8, bpy]} letter="D" dir={[0, 1]} />
      <ViewTitle x={plan.ox + 34} y={160} text="Vista superior (orientação de impressão) · 俯视图（打印方向）" scale="1:1" />
      <Solid v={cc} ds={[rectSegs(box.yMin, box.yMax, -wall, 0), rectSegs(-post.diameter / 2, post.diameter / 2, -0.2, post.top), ...(L.cradle ? [rectSegs(L.cradle.yMin, L.cradle.yMin + p.cradleWall, 0, L.cradle.height), rectSegs(L.cradle.yMax - p.cradleWall, L.cradle.yMax, 0, L.cradle.height)] : [])]} />
      <Void v={cc} u1={-post.seatDiameter / 2} u2={post.seatDiameter / 2} w1={post.top - post.seatDepth} w2={post.top} open="t" />
      <Void v={cc} u1={-post.legHole / 2} u2={post.legHole / 2} w1={1} w2={post.top - post.seatDepth} />
      <Void v={cc} u1={post.slot.dir > 0 ? 0 : -(post.diameter / 2 + 1)} u2={post.slot.dir > 0 ? post.diameter / 2 + 1 : 0} w1={0} w2={post.slot.height} open="b" />
      <Line v={cc} a={[0, -wall - 3]} b={[0, post.top + 5]} c="ctr" />
      <DimV v={cc} w1={-wall} w2={0} u={box.yMin} off={-6} text={f(wall)} />
      <DimV v={cc} w1={0} w2={post.top} u={post.diameter / 2} off={-16} u2={-post.diameter / 2} text={f(post.top)} />
      <DimV v={cc} w1={0} w2={post.slot.height} u={slotU} off={post.slot.dir > 0 ? -8 : 8} text={f(post.slot.height)} />
      {L.cradle && <DimV v={cc} w1={0} w2={L.cradle.height} u={L.cradle.yMax} off={-8} text={f(L.cradle.height)} />}
      <DimH v={cc} u1={-post.diameter / 2} u2={post.diameter / 2} w={post.top} off={5} text={`⌀${f(post.diameter)}`} />
      <ViewTitle x={cc.ox - 20} y={120} text="Corte C–C (x = 0) · 剖视 C–C" scale="1:1" />
      <Solid v={dd} ds={[rectSegs(box.xMin, box.xMax, -wall, 0), ...[L.boardPosts[0]!, L.boardPosts[2]!].map((q) => rectSegs(q.x - 3.5, q.x + 3.5, -0.2, board.standoffHeight))]} />
      {[L.boardPosts[0]!, L.boardPosts[2]!].map((q, i) => <Void key={i} v={dd} u1={q.x - p.pilotHole / 2} u2={q.x + p.pilotHole / 2} w1={1} w2={board.standoffHeight} open="t" />)}
      <Rect v={dd} u1={board.xMin} u2={board.xMax} w1={board.standoffHeight} w2={board.standoffHeight + 1.6} fill="#cdeedb" />
      <DimV v={dd} w1={0} w2={board.standoffHeight} u={L.boardPosts[2]!.x + 3.5} off={8} text={f(board.standoffHeight)} />
      <DimH v={dd} u1={L.boardPosts[0]!.x - 3.5} u2={L.boardPosts[0]!.x + 3.5} w={board.standoffHeight + 1.6} off={5} text="⌀7" />
      <ViewTitle x={dd.ox} y={158} text={`Corte D–D (y = ${f(bpy)}) · 剖视 D–D`} scale="1:1" />
      <g className="dt-table">
        <line className="dt-thin" x1={135} x2={290} y1={19} y2={19} />
        {rowsH.map(([a, b, c], i) => (
          <g key={a}>
            <T className="dt-t dt-tv" x={135} y={24 + i * 8.5}>{a}</T>
            <T className="dt-t dt-tn" x={135} y={27.8 + i * 8.5}>{b}</T>
            <T className="dt-t dt-tn dt-tzh" x={218} y={27.8 + i * 8.5}>{c}</T>
          </g>
        ))}
      </g>
    </Sheet>
  );
}

/* ================= DT-09 ================= */
function M4Difusor({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, cav } = g;
  const seat = L.diffuserSeat;
  const disc: V = { ox: 66, oy: 36, s: 2 };
  const discTop: V = { ox: 66, oy: 100, s: 2 };
  const det: V = { ox: 212, oy: 260, s: 5 };
  const roofTop = box.height;
  const bottom = 37.8;
  return (
    <Sheet info={info(version, "DT-09", "M4 Difusor e assento no teto do M1", "M4 扩散片及 M1 顶板凹槽", "M4", "2:1 · 5:1", sheet, total)}>
      <Rect v={disc} u1={-13} u2={13} w1={0} w2={p.diffuserThickness} />
      <Line v={disc} a={[0, -3]} b={[0, 3]} c="ctr" />
      <DimH v={disc} u1={-13} u2={13} w={p.diffuserThickness} off={6} text={`⌀${f(p.diffuserDiameter)}`} />
      <DimV v={disc} w1={0} w2={p.diffuserThickness} u={13} off={9} text={f(p.diffuserThickness)} />
      <ViewTitle x={disc.ox} y={50} text="Vista frontal · 正视图" scale="2:1" />
      <Circ v={discTop} u={0} w={0} r={13} />
      <Ctr v={discTop} u={0} w={0} len={16} />
      <Lead v={discTop} at={[13 * Math.cos(0.7), -13 * Math.sin(0.7)]} dx={14} dy={14} text={`⌀${f(p.diffuserDiameter)}`} />
      <ViewTitle x={discTop.ox} y={142} text="Vista superior · 俯视图" scale="2:1" />
      <Solid v={det} ds={[rectSegs(-14, 14, cav.top, roofTop)]} />
      <Void v={det} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w1={cav.top} w2={roofTop} open="tb" />
      <Void v={det} u1={-seat.diameter / 2} u2={seat.diameter / 2} w1={cav.top} w2={seat.top} open="b" />
      <Void v={det} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w1={roofTop - p.channelDepth} w2={roofTop} open="t" />
      <Solid v={det} ds={[rectSegs(-p.diffuserDiameter / 2, p.diffuserDiameter / 2, bottom, bottom + p.diffuserThickness)]} />
      <Circ v={det} u={-p.diffuserDiameter / 2 - 0.3} w={bottom + p.diffuserThickness} r={0.45} fill="#ffe08a" />
      <Circ v={det} u={p.diffuserDiameter / 2 + 0.3} w={bottom + p.diffuserThickness} r={0.45} fill="#ffe08a" />
      <DimV v={det} w1={cav.top} w2={roofTop} u={-14} off={-8} text={`${f(p.wall)} (teto)`} />
      <DimV v={det} w1={cav.top} w2={seat.top} u={14} off={9} text={`${f(seat.top - cav.top)} (assento)`} />
      <DimH v={det} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w={roofTop} off={9} text={`janela ⌀${f(p.ledWindowDiameter)}`} />
      <DimH v={det} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w={roofTop} off={19} text={`canal ${f(p.slideWidth + p.slideFit)} × ${f(p.channelDepth)} (*)`} />
      <DimH v={det} u1={-seat.diameter / 2} u2={seat.diameter / 2} w={cav.top} off={-9} text={`assento ⌀${f(seat.diameter)} (*)`} />
      <Lead v={det} at={[-p.diffuserDiameter / 2 + 1, bottom + 0.4]} dx={-18} dy={22} text="M4 (hachurado) · 扩散片" />
      <Lead v={det} at={[p.diffuserDiameter / 2 + 0.3, bottom + p.diffuserThickness]} dx={-20} dy={30} text="cola quente W3 · 热熔胶" />
      <ViewTitle x={det.ox} y={112} text="Detalhe G: teto do M1 em corte · 局部详图 G" scale="5:1" />
      <Block
        x={140}
        y={132}
        head="Material e cor · 材料与颜色"
        lines={[{ t: "PLA natural ou branco, 1 a 2 camadas de 0,2 mm (≈ 0,8 mm). Sem suportes." }, { t: "本色或白色 PLA，1~2 层 0.2 mm（约 0.8 mm）。无需支撑。", zh: true }]}
      />
    </Sheet>
  );
}

const SHEETS = [Conjunto, PlantaInterior, CorteLongitudinal, M1Externa, M1Cortes, M1Detalhes, M2Abracadeira, M3Tampa, M4Difusor];
export const DRAWING_SHEETS = SHEETS.length;

export function Desenhos({ version }: { version: SuporteVersion }): ReactNode {
  const g = useMemo(() => geometry(version), [version]);
  return (
    <>
      {SHEETS.map((S, i) => (
        <section className="sheet drawing" key={i}>
          <S g={g} version={version} sheet={i + 1} total={SHEETS.length} />
        </section>
      ))}
    </>
  );
}

interface Box {
  l: number; t: number; r: number; b: number;
}

/**
 * Collision check, run in the browser (#suporte/manual/v1/1/check): reports text that overlaps other text or a balloon,
 * and text outside the frame or on the title block. The result is written to <pre id="dt-check"> for a headless run.
 */
export function DrawingCheck({ version }: { version: SuporteVersion }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const out: string[] = [];
      document.querySelectorAll<SVGSVGElement>("svg.dt-sheet").forEach((svg) => {
        const code = svg.getAttribute("aria-label")?.split(" ")[0] ?? "?";
        const frame = svg.getBoundingClientRect();
        const k = 297 / frame.width;
        const mm = (r: DOMRect): Box => ({ l: (r.left - frame.left) * k, t: (r.top - frame.top) * k, r: (r.right - frame.left) * k, b: (r.bottom - frame.top) * k });
        const title = svg.querySelector<SVGRectElement>(".dt-title rect");
        const titleBox = title ? mm(title.getBoundingClientRect()) : null;
        const notes = svg.querySelector<SVGGElement>(".dt-notes");
        const notesBox = notes ? mm(notes.getBoundingClientRect()) : null;
        const items: { box: Box; label: string; kind: "text" | "balloon" }[] = [];
        svg.querySelectorAll<SVGTextElement>("text").forEach((el) => {
          if (el.closest(".dt-title") || el.closest(".dt-notes") || el.closest(".dt-balloon")) return;
          const txt = (el.textContent ?? "").trim();
          if (!txt) return;
          items.push({ box: mm(el.getBoundingClientRect()), label: txt, kind: "text" });
        });
        svg.querySelectorAll<SVGGElement>(".dt-balloon").forEach((el) => {
          const c = el.querySelectorAll("circle")[1];
          if (!c) return;
          items.push({ box: mm((c as SVGCircleElement).getBoundingClientRect()), label: `(${el.textContent})`, kind: "balloon" });
        });
        const hit = (a: Box, b: Box) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.6 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.6;
        for (let i = 0; i < items.length; i++) {
          const a = items[i]!;
          if (a.box.l < 5.5 || a.box.r > 291.5 || a.box.t < 5.5 || a.box.b > 204.5) out.push(`${code} fora da moldura: ${a.label}`);
          if (titleBox && hit(a.box, titleBox)) out.push(`${code} sobre o carimbo: ${a.label}`);
          if (notesBox && hit(a.box, notesBox)) out.push(`${code} sobre as notas: ${a.label}`);
          for (let j = i + 1; j < items.length; j++) {
            const b = items[j]!;
            if (hit(a.box, b.box)) out.push(`${code} colisão: ${a.label} × ${b.label}`);
          }
        }
      });
      if (ref.current) ref.current.textContent = JSON.stringify({ version, problems: out });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [version]);
  return (
    <div className="manual-doc">
      <pre id="dt-check" ref={ref}>pendente</pre>
      <Desenhos version={version} />
    </div>
  );
}
