import { useMemo, type ReactNode } from "react";
import { DEFAULT_HOLDER_PARAMS, holderLayout, masterPlan, type HolderLayout, type SuporteVersion } from "@simiot/adapter-cad";
import {
  Balloon, Circ, circleSegs, Ctr, CutMark, Dia, DimH, DimV, f, Lead, Line, Rect, rectSegs, Sheet, Shape, Solid, Void, VoidShape, ViewTitle,
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
  const R = L.ring.outerRadius;
  const bore = L.ring.boreDiameter / 2;
  const earX = L.ears[1]!.x;
  const earHalf = L.ears[1]!.width / 2;
  const sw = p.switchCutout;
  return { L, p, R, bore, earX, earHalf, sw, wall: p.wall, v2: version === "v2", box: L.box, cav: L.cavity, col: L.column, ring: L.ring, arm: L.arm, tube: L.tube };
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
  return [
    ["M", u1, w1 + r], ["A", r, u2, w1 + r, 0], ["L", u2, w2 - r], ["A", r, u1, w2 - r, 0], ["Z"],
  ];
}

/** ---------- sheet 1: general assembly ---------- */
function Conjunto({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { p, R, earX, earHalf, box, col, ring, tube, sw } = g;
  const s = 0.4;
  const front: V = { ox: 70, oy: 112, s };
  const top: V = { ox: 262, oy: 64, s };
  const side: V = { ox: 196, oy: 112, s, fx: -1 };
  const head = tube.top + 15;
  return (
    <Sheet info={info(version, "DT-01", "Conjunto geral", "总装图", "Conjunto 总成", "1:2,5", sheet, total)}>
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
      <Rect v={front} u1={-tube.objectiveRadius} u2={tube.objectiveRadius} w1={tube.noseZ} w2={tube.sleeveBottom} fill="#fff" />
      <Rect v={front} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={20 - sw.height / 2} w2={20 + sw.height / 2} c="hid" />
      {g.v2 && <Circ v={front} u={p.knobX} w={20} r={p.knobDiameter / 2} c="hid" />}
      <Ctr v={front} u={0} w={110} len={118} only="v" />
      <DimV v={front} w1={0} w2={tube.top} u={-45} off={-16} />
      <DimV v={front} w1={0} w2={40} u={45} off={8} />
      <DimV v={front} w1={ring.bottom} w2={ring.top} u={earX + earHalf} off={8} />
      <DimH v={front} u1={-45} u2={45} w={-p.wall} off={-7} />
      <DimV v={front} w1={0} w2={tube.noseZ} u={-45} off={-26} text={`${f(tube.noseZ)} (lente)`} />
      <Balloon v={front} at={[45, 30]} dx={13} dy={-8} id="M1" />
      <Balloon v={front} at={[-40, -1.2]} dx={-12} dy={10} id="M3" />
      <Balloon v={front} at={[earX + earHalf, ring.top - 14]} dx={14} dy={6} id="M2" />
      <Balloon v={front} at={[-25, tube.top + 7.5]} dx={-14} dy={-4} id="P1" />
      <Balloon v={front} at={[tube.radius, 150]} dx={14} dy={0} id="P2" />
      <Balloon v={front} at={[tube.objectiveRadius, 58]} dx={16} dy={0} id="P9" />
      <Balloon v={front} at={[sw.x - sw.width / 2, 22]} dx={-12} dy={-8} id="SW1" />
      {g.v2 && <Balloon v={front} at={[p.knobX, 20]} dx={14} dy={12} id="RV1" />}
      <ViewTitle x={front.ox} y={128} text="Vista frontal · 正视图" scale="1:2,5" />
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
      <Balloon v={top} at={[0, 55]} dx={-20} dy={-6} id="M1" />
      <Balloon v={top} at={[38, 8]} dx={-4} dy={20} id="L1" />
      <ViewTitle x={top.ox} y={100} text="Vista superior · 俯视图" scale="1:2,5" />
      {/* left */}
      <Rect v={side} u1={-45} u2={70} w1={0} w2={40} r={1} />
      <Rect v={side} u1={-45} u2={70} w1={-p.wall} w2={0} />
      <Shape v={side} segs={profileSegs(g, tube.top)} />
      <Rect v={side} u1={-R} u2={R} w1={ring.bottom} w2={ring.top} c="hid" />
      <Rect v={side} u1={-tube.radius} u2={tube.radius} w1={tube.bottom} w2={tube.top} />
      <Rect v={side} u1={-7.5} u2={7.5} w1={tube.top} w2={head} />
      <Rect v={side} u1={-tube.sleeveRadius} u2={tube.sleeveRadius} w1={tube.sleeveBottom} w2={tube.bottom} />
      <Rect v={side} u1={-tube.objectiveRadius} u2={tube.objectiveRadius} w1={tube.noseZ} w2={tube.sleeveBottom} />
      <Rect v={side} u1={-13} u2={13} w1={39.4} w2={40.4} />
      <DimH v={side} u1={-45} u2={70} w={-p.wall} off={-7} />
      <DimV v={side} w1={0} w2={tube.top} u={70} off={-16} />
      <Lead v={side} at={[-tube.objectiveRadius, 40.8]} dx={14} dy={18} text="folga óptica 0,8 (L1 → P9)" />
      <Balloon v={side} at={[55, 120]} dx={-12} dy={-10} id="M1" />
      <Balloon v={side} at={[0, 140]} dx={14} dy={-8} id="P2" />
      {g.v2 && <Balloon v={side} at={[0, 20]} dx={-26} dy={-26} id="J1" />}
      <ViewTitle x={side.ox - 8} y={128} text="Vista lateral esquerda · 左视图" scale="1:2,5" />
    </Sheet>
  );
}

/** ---------- sheet 2: master plan, horizontal section through the box ---------- */
function PlantaInterior({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, cav, wall, sw, v2 } = g;
  const v: V = { ox: 66, oy: 94, s: 1 };
  const plan = masterPlan(version).filter((q) => q.hidden && !["M3", "M4", "W3", "H1"].includes(q.id));
  const board = L.board;
  const bw = board.xMax - board.xMin;
  const bx = (board.xMin + board.xMax) / 2;
  const by = (board.yMin + board.yMax) / 2;
  const seg = (u1: number, u2: number, w1: number, w2: number, r: number): Seg[] => {
    const a = [["M", u1 + r, w1], ["L", u2 - r, w1], ["A", r, u2, w1 + r, 0], ["L", u2, w2 - r], ["A", r, u2 - r, w2, 0], ["L", u1 + r, w2], ["A", r, u1, w2 - r, 0], ["L", u1, w1 + r], ["A", r, u1 + r, w1, 0], ["Z"]] as Seg[];
    return a;
  };
  const wallRing: Seg[][] = [[...seg(box.xMin, box.xMax, box.yMin, box.yMax, p.cornerRadius), ...seg(cav.xMin, cav.xMax, cav.yMin, cav.yMax, p.cornerRadius - wall)]];
  const placed = (id: string) => plan.find((q) => q.id === id);
  const u1 = placed("U1")!;
  const r1 = placed("R1")!;
  const c1 = placed("C1")!;
  const pcb = placed("PCB1")!;
  return (
    <Sheet info={info(version, "DT-02", "Planta-mãe: interior da caixa (corte horizontal z = 20)", "总装平面图：盒内布置（水平剖切 z = 20）", "Conjunto 总成", "1:1", sheet, total)}>
      <Solid v={v} ds={wallRing} evenodd />
      {L.posts.map((q, i) => <Solid key={i} v={v} ds={[[...circleSegs(q.x, q.y, 4), ...circleSegs(q.x, q.y, p.pilotHole / 2)]]} evenodd />)}
      <Void v={v} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={box.yMin} w2={box.yMin + wall} open="tb" />
      {v2 && <Void v={v} u1={p.knobX - p.knobDiameter / 2} u2={p.knobX + p.knobDiameter / 2} w1={box.yMin} w2={box.yMin + wall} open="tb" />}
      {v2 && <Void v={v} u1={box.xMax - wall} u2={box.xMax} w1={p.jackY - p.jackDiameter / 2} w2={p.jackY + p.jackDiameter / 2} open="lr" />}
      {/* parts inside the box */}
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
      {v2 && <Rect v={v} u1={placed("D2")!.x - 2.6} u2={placed("D2")!.x + 2.6} w1={placed("D2")!.y - 1.35} w2={placed("D2")!.y + 1.35} fill="#1d2027" />}
      <Rect v={v} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={box.yMin + wall} w2={box.yMin + wall + 10} c="hid" />
      {v2 && <Circ v={v} u={p.knobX} w={box.yMin + wall + 1} r={5} c="hid" />}
      {v2 && <Rect v={v} u1={box.xMax - wall - 10} u2={box.xMax - wall} w1={p.jackY - 4.9} w2={p.jackY + 4.9} c="hid" />}
      <Circ v={v} u={0} w={0} r={12} c="hid" />
      <Ctr v={v} u={0} w={0} len={16} />
      {/* dimensions */}
      <DimH v={v} u1={box.xMin} u2={box.xMax} w={box.yMin} off={-8} />
      <DimV v={v} w1={box.yMin} w2={box.yMax} u={box.xMin} off={-9} />
      <DimH v={v} u1={board.xMin} u2={board.xMax} w={board.yMin} off={-3} />
      <DimV v={v} w1={board.yMin} w2={board.yMax} u={board.xMax} off={9} />
      {/* balloons */}
      {[["D1", 0, 0, 24, 14], ["PCB1", bx + bw / 2, by + 6, 20, 0], ["U1", u1.x, u1.y + 2, 0, -17], ["R1", r1.x, r1.y, 6, 14], ["C1", c1.x, c1.y, -4, 14]].map(([id, x, y, dx, dy]) => (
        <Balloon key={id as string} v={v} at={[x as number, y as number]} dx={dx as number} dy={dy as number} id={id as string} />
      ))}
      <Balloon v={v} at={[sw.x + 6, box.yMin + wall + 4]} dx={0} dy={-20} id="SW1" />
      {v2 ? (
        <>
          <Balloon v={v} at={[placed("D2")!.x, placed("D2")!.y]} dx={-3} dy={15} id="D2" />
          <Balloon v={v} at={[p.knobX, box.yMin + wall + 2]} dx={0} dy={-20} id="RV1" />
          <Balloon v={v} at={[box.xMax - wall - 4, p.jackY]} dx={-9} dy={-14} id="J1" />
        </>
      ) : (
        <Balloon v={v} at={[p.batteryLength / 2 - 6, p.batteryY]} dx={12} dy={-8} id="BT1" />
      )}
      <Balloon v={v} at={[L.posts[2]!.x, L.posts[2]!.y]} dx={-14} dy={9} id="M1" />
      <ViewTitle x={v.ox + 40} y={154} text="Planta sem tampa e sem teto · 无底盖无顶板平面图" scale="1:1" />
      {/* coordinates */}
      <g className="dt-table">
        <text className="dt-t dt-tnh" x={140} y={16}>Posição do centro de cada peça (mm) · 零件中心位置</text>
        <line className="dt-thin" x1={140} x2={290} y1={18.5} y2={18.5} />
        {["ID", "X", "Y", "Z", "Dimensão · 尺寸"].map((h, i) => <text key={h} className="dt-t dt-tl" x={[140, 156, 172, 188, 206][i]} y={22.5}>{h}</text>)}
        {plan.map((q, i) => (
          <g key={q.id}>
            <text className="dt-t dt-tv" x={140} y={28.5 + i * 5.4}>{q.id}</text>
            <text className="dt-t dt-tv" x={156} y={28.5 + i * 5.4}>{f(q.x)}</text>
            <text className="dt-t dt-tv" x={172} y={28.5 + i * 5.4}>{f(q.y)}</text>
            <text className="dt-t dt-tv" x={188} y={28.5 + i * 5.4}>{f(q.z)}</text>
            <text className="dt-t dt-tv" x={206} y={28.5 + i * 5.4}>{q.size.map(f).join(" × ")}</text>
          </g>
        ))}
        <text className="dt-t dt-tn" x={140} y={32 + plan.length * 5.4}>Origem: eixo do tubo, z = 0 no piso da caixa. · 原点：镜筒轴线，z = 0 为灯箱底面。</text>
        <text className="dt-t dt-tn" x={140} y={37 + plan.length * 5.4}>Placa PCB1: {f(pcb.size[0])} × {f(pcb.size[1])} × {f(pcb.size[2])} mm, face superior em z = {f(pcb.z + 0.8)}.</text>
      </g>
    </Sheet>
  );
}

/** ---------- sheet 3: master plan, longitudinal section A-A ---------- */
function CorteLongitudinal({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, cav, wall, col, tube } = g;
  const v: V = { ox: 118, oy: 150, s: 1.15, fx: -1 };
  const zCut = 100;
  const seat = L.diffuserSeat;
  const post = L.ledPost;
  const slideTop = L.samplePlane;
  const roofTop = box.height;
  const shell: Seg[] = [
    ["M", box.yMin, 0], ["L", box.yMin, roofTop - 2], ["A", 2, box.yMin + 2, roofTop, 1], ["L", box.yMax, roofTop], ["L", box.yMax, 0], ["L", cav.yMax, 0], ["L", cav.yMax, cav.top], ["L", cav.yMin, cav.top], ["L", cav.yMin, 0], ["Z"],
  ];
  const lid: Seg[] = rectSegs(box.yMin, box.yMax, -wall, 0);
  const dir = post.slot.dir;
  const batteryY = p.batteryY;
  const pcbY = version === "v1" ? [-31.5, -6.5] : [25.5, 50.5];
  const board = L.board;
  return (
    <Sheet info={info(version, "DT-03", "Planta-mãe: corte longitudinal A–A (x = 0) e pilha óptica", "总装剖视图 A–A（x = 0）与光学叠层", "Conjunto 总成", "1,15:1", sheet, total)}>
      <Solid v={v} ds={[shell, lid, profileSegs(g, zCut)]} />
      {/* roof: window, diffuser seat and slide channel */}
      <Void v={v} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w1={cav.top} w2={roofTop} open="tb" />
      <Void v={v} u1={-seat.diameter / 2} u2={seat.diameter / 2} w1={cav.top} w2={seat.top} open="b" />
      <Void v={v} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w1={roofTop - p.channelDepth} w2={roofTop} open="t" />
      <Void v={v} u1={col.yMin} u2={col.yMax} w1={L.columnWindow!.zMin} w2={zCut} open="lrt" />
      {/* LED post on the lid */}
      <Solid v={v} ds={[rectSegs(-post.diameter / 2, post.diameter / 2, -0.2, post.top)]} />
      <Void v={v} u1={-post.seatDiameter / 2} u2={post.seatDiameter / 2} w1={post.top - post.seatDepth} w2={post.top} open="t" />
      <Void v={v} u1={-post.legHole / 2} u2={post.legHole / 2} w1={1} w2={post.top - post.seatDepth} />
      <Void v={v} u1={dir > 0 ? 0 : -(post.diameter / 2 + 1)} u2={dir > 0 ? post.diameter / 2 + 1 : 0} w1={0} w2={post.slot.height} open="b" />
      {/* LED, diffuser disc, slide */}
      <Rect v={v} u1={-2.5} u2={2.5} w1={post.top - post.seatDepth + 1.5} w2={post.ledTop - 2.5} fill="#fffbe6" />
      <Shape v={v} segs={[["M", -2.5, post.ledTop - 2.5], ["A", 2.5, 2.5, post.ledTop - 2.5, 0], ["Z"]]} fill="#fffbe6" />
      <Solid v={v} ds={[rectSegs(-p.diffuserDiameter / 2, p.diffuserDiameter / 2, 37.8, 38.6)]} />
      <Solid v={v} ds={[rectSegs(-13, 13, slideTop - 1, slideTop)]} />
      {/* pregoscopio parts above the slide, cut by the plane (outline) */}
      <Rect v={v} u1={-tube.objectiveRadius} u2={tube.objectiveRadius} w1={tube.noseZ} w2={tube.sleeveBottom} fill="#f6e7c8" />
      <Rect v={v} u1={-tube.sleeveRadius} u2={tube.sleeveRadius} w1={tube.sleeveBottom} w2={tube.bottom} fill="#e5e9f0" />
      <Rect v={v} u1={-tube.radius} u2={tube.radius} w1={tube.bottom} w2={zCut} fill="#eef1f6" />
      {/* board, battery */}
      {version === "v1" && L.cradle && (
        <>
          <Solid v={v} ds={[rectSegs(L.cradle.yMin, L.cradle.yMin + p.cradleWall, 0, L.cradle.height), rectSegs(L.cradle.yMax - p.cradleWall, L.cradle.yMax, 0, L.cradle.height)]} />
          <Rect v={v} u1={batteryY - p.batteryWidth / 2} u2={batteryY + p.batteryWidth / 2} w1={0} w2={17.5} fill="#dde2ea" />
        </>
      )}
      <Rect v={v} u1={pcbY[0]!} u2={pcbY[1]!} w1={board.standoffHeight} w2={board.standoffHeight + 1.6} fill="#cdeedb" />
      <Rect v={v} u1={-4} u2={4} w1={board.standoffHeight + 1.6} w2={board.standoffHeight + 9} fill="#2a2f38" c="hid" />
      <Line v={v} a={[0, zCut]} b={[0, 0]} c="ctr" />
      <Line v={v} a={[-tube.radius - 2, zCut]} b={[tube.radius + 2, zCut]} c="thin" />
      {/* dimensions */}
      <DimV v={v} w1={0} w2={roofTop} u={box.yMin} off={-12} />
      <DimV v={v} w1={0} w2={post.top} u={post.diameter / 2} off={-28} text={`${f(post.top)} (poste)`} u2={-post.diameter / 2} />
      <DimV v={v} w1={0} w2={post.ledTop} u={-post.diameter / 2} off={26} text={`${f(post.ledTop)} (topo do LED)`} />
      <DimV v={v} w1={cav.top} w2={roofTop} u={box.yMin} off={-26} text={f(wall)} />
      <DimV v={v} w1={slideTop} w2={tube.noseZ} u={tube.objectiveRadius} off={-34} text="0,8" />
      <DimV v={v} w1={0} w2={tube.noseZ} u={box.yMin} off={-40} text={`${f(tube.noseZ)} (lente)`} />
      <DimH v={v} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w={roofTop} off={24} text={`janela ⌀${f(p.ledWindowDiameter)}`} />
      <DimH v={v} u1={-seat.diameter / 2} u2={seat.diameter / 2} w={roofTop} off={32} text={`assento ⌀${f(seat.diameter)} (*)`} />
      <DimH v={v} u1={box.yMin} u2={box.yMax} w={-wall} off={-8} />
      <Lead v={v} at={[-12, slideTop - 0.5]} dx={-26} dy={-12} text="L1 lâmina 1,0 (z 39,4–40,4)" />
      <Lead v={v} at={[0, 38.2]} dx={24} dy={-20} text="M4 difusor ⌀26 × 0,8" />
      <Lead v={v} at={[0, post.top - 1]} dx={22} dy={-28} text={`piloto ⌀${f(post.legHole)}, fenda ${f(post.slot.height)} alta`} />
      <Lead v={v} at={[box.yMax - 1, 90]} dx={-14} dy={-4} text="coluna" />
      {[
        ["M1", 60, 20, 12, -14], ["M3", 55, -1.2, 10, 14], ["D1", 0, 34, 20, -14], ["L1", -12, slideTop - 0.5, 20, -8], ["P9", -10, 62, 16, 0], ["M4", 9, 38.2, -14, -16],
      ].map(([id, y, z, dx, dy]) => <Balloon key={id as string} v={v} at={[y as number, z as number]} dx={dx as number} dy={dy as number} id={id as string} />)}
      <Balloon v={v} at={[(pcbY[0]! + pcbY[1]!) / 2, board.standoffHeight + 0.8]} dx={0} dy={22} id="PCB1" />
      {version === "v1" && <Balloon v={v} at={[batteryY, 17.5]} dx={0} dy={-20} id="BT1" />}
      <ViewTitle x={v.ox - 6} y={160} text="Corte A–A · 剖视 A–A" scale="1,15:1" />
      <g className="dt-table">
        <text className="dt-t dt-tnh" x={178} y={16}>Pilha óptica (de baixo para cima) · 光学叠层（自下而上）</text>
        <line className="dt-thin" x1={178} x2={290} y1={18.5} y2={18.5} />
        {[
          ["LED D1 (topo)", `z = ${f(post.ledTop)}`],
          ["Difusor M4", "z = 37,8 a 38,6"],
          ["Face superior do teto", `z = ${f(roofTop)}`],
          ["Lâmina L1 (topo)", `z = ${f(slideTop)}`],
          ["Lente da objetiva P9", `z = ${f(tube.noseZ)}`],
          ["Distância de trabalho", `${f(p.workingDistance)} mm`],
          ["Objetiva P9", `⌀${f(p.objectiveDiameter)} × ${f(p.objectiveLength)}`],
        ].map(([a, b], i) => (
          <g key={a}><text className="dt-t dt-tv" x={178} y={25 + i * 5.6}>{a}</text><text className="dt-t dt-tv" x={250} y={25 + i * 5.6}>{b}</text></g>
        ))}
        <text className="dt-t dt-tn" x={178} y={68}>O corte passa pelo eixo do tubo. A coluna e o tubo seguem acima</text>
        <text className="dt-t dt-tn" x={178} y={72}>de z = 100 (interrompido). · 剖面通过镜筒轴线，z = 100 以上截断。</text>
      </g>
    </Sheet>
  );
}

/** ---------- sheet 4: M1 external views ---------- */
function M1Externa({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, R, bore, earX, earHalf, box, cav, col, ring, sw, wall } = g;
  const s = 1 / 3;
  const front: V = { ox: 66, oy: 100, s };
  const top: V = { ox: 258, oy: 66, s: 0.5 };
  const side: V = { ox: 176, oy: 100, s, fx: -1 };
  const win = L.columnWindow!;
  return (
    <Sheet info={info(version, "DT-04", "M1 Suporte: vistas externas", "M1 支架：外形视图", "M1", "1:3", sheet, total)}>
      {/* front */}
      <Rect v={front} u1={box.xMin} u2={box.xMax} w1={0} w2={box.height} r={1.5} />
      <Rect v={front} u1={-22} u2={22} w1={col.bottom} w2={col.top} />
      <Shape v={front} segs={stadiumSegs(-win.width / 2, win.width / 2, win.zMin, win.zMax)} />
      <Rect v={front} u1={-R} u2={R} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={-bore} u2={bore} w1={ring.bottom} w2={ring.top} c="hid" />
      <Rect v={front} u1={earX - earHalf} u2={earX + earHalf} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={-earX - earHalf} u2={-earX + earHalf} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={20 - sw.height / 2} w2={20 + sw.height / 2} />
      {g.v2 && <Circ v={front} u={p.knobX} w={20} r={p.knobDiameter / 2} />}
      <DimV v={front} w1={0} w2={col.top} u={-45} off={-14} />
      <DimV v={front} w1={0} w2={box.height} u={45} off={8} />
      <DimV v={front} w1={win.zMin} w2={win.zMax} u={22} off={10} text={`janela ${f(win.zMax - win.zMin)}`} />
      <DimV v={front} w1={ring.bottom} w2={ring.top} u={earX + earHalf} off={8} />
      <DimH v={front} u1={-win.width / 2} u2={win.width / 2} w={win.zMax} off={4} />
      <DimH v={front} u1={-earX - earHalf} u2={earX + earHalf} w={col.top} off={9} />
      <DimH v={front} u1={-45} u2={45} w={0} off={-7} />
      <DimV v={front} w1={win.zMin} w2={0} u={-22} off={-8} text={f(win.zMin)} />
      <Lead v={front} at={[sw.x - sw.width / 2, 24]} dx={-8} dy={-12} text={`recorte ${f(sw.width)} × ${f(sw.height)} (*)`} />
      <DimH v={front} u1={0} u2={sw.x} w={20 - sw.height / 2} off={-3} text={f(Math.abs(sw.x))} />
      {g.v2 && <Lead v={front} at={[p.knobX + 3, 22]} dx={10} dy={-10} text={`⌀${f(p.knobDiameter)} (*), x = ${f(p.knobX)}`} />}
      <Ctr v={front} u={0} w={110} len={118} only="v" />
      <ViewTitle x={front.ox} y={118} text="Vista frontal · 正视图" scale="1:3" />
      {/* plan */}
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
      <DimH v={top} u1={L.posts[0]!.x} u2={L.posts[2]!.x} w={box.yMax - 14} off={-3} />
      <Lead v={top} at={[-box.xMax + 2, box.yMin + 2]} dx={-8} dy={8} text={`R${f(p.cornerRadius)}`} />
      <ViewTitle x={top.ox} y={114} text="Vista superior · 俯视图" scale="1:2" />
      <g className="dt-table">
        <text className="dt-t dt-tnh" x={8} y={134}>Recortes principais · 主要开孔</text>
        <text className="dt-t dt-tn" x={8} y={139.5}>janela do LED ⌀{f(p.ledWindowDiameter)} · assento do difusor ⌀{f(L.diffuserSeat.diameter)} (*) · canal da lâmina {f(p.slideWidth + p.slideFit)} (*) × {f(p.channelDepth)}</text>
        <text className="dt-t dt-tn" x={8} y={144.5}>furo do anel ⌀{f(bore * 2)} (*) · janela da coluna {f(p.windowWidth)} × {f(win.zMax - win.zMin)} · recorte SW1 {f(sw.width)} × {f(sw.height)} (*)</text>
        <text className="dt-t dt-tn dt-tzh" x={8} y={149.5}>LED 光窗、扩散片凹槽、载玻片槽、环孔、立柱窗口、开关开孔（带 (*) 的尺寸待校准）。详见 DT-05 / DT-06。</text>
      </g>
      {/* left */}
      <Rect v={side} u1={box.yMin} u2={box.yMax} w1={0} w2={box.height} r={1.5} />
      <Shape v={side} segs={profileSegs(g, col.top)} />
      <Rect v={side} u1={col.yMin} u2={col.yMax} w1={win.zMin} w2={win.zMax} c="hid" />
      <Rect v={side} u1={1} u2={9} w1={ring.top - 11 - 0.7} w2={ring.top - 11 + 0.7} c="hid" />
      <DimH v={side} u1={box.yMin} u2={box.yMax} w={0} off={-7} />
      <DimH v={side} u1={col.yMin} u2={col.yMax} w={col.top} off={6} text={f(p.columnDepth)} />
      <DimH v={side} u1={0} u2={col.yMin + 0.5} w={ring.bottom} off={-4} text={f(col.yMin + 0.5)} />
      <DimV v={side} w1={0} w2={col.top} u={col.yMax} off={-14} />
      <DimV v={side} w1={ring.bottom} w2={ring.top} u={0} off={8} text={f(p.ringHeight)} />
      <Lead v={side} at={[col.yMax - 2, col.top - 3]} dx={-12} dy={-9} text={`R${f(p.columnRound)}`} />
      <Lead v={side} at={[col.yMin - 4, ring.bottom - 6]} dx={10} dy={14} text={`R${f(p.columnRound)}`} />
      <Lead v={side} at={[5, ring.top - 11]} dx={22} dy={22} text={`2× piloto ⌀${f(p.pilotHole)} × 8 (*)`} />
      <ViewTitle x={side.ox - 10} y={118} text="Vista lateral esquerda · 左视图" scale="1:3" />
    </Sheet>
  );
}

/** ---------- sheet 5: M1 sections ---------- */
function M1Cortes({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, cav, wall, col, ring, sw } = g;
  const win = L.columnWindow!;
  const seat = L.diffuserSeat;
  const a: V = { ox: 90, oy: 134, s: 0.5, fx: -1 };
  const b: V = { ox: 214, oy: 84, s: 1 };
  const roofTop = box.height;
  const shell: Seg[] = [
    ["M", box.yMin, 0], ["L", box.yMin, roofTop - 2], ["A", 2, box.yMin + 2, roofTop, 1], ["L", box.yMax, roofTop], ["L", box.yMax, 0], ["L", cav.yMax, 0], ["L", cav.yMax, cav.top], ["L", cav.yMin, cav.top], ["L", cav.yMin, 0], ["Z"],
  ];
  const seg = (u1: number, u2: number, w1: number, w2: number, r: number): Seg[] => [
    ["M", u1 + r, w1], ["L", u2 - r, w1], ["A", r, u2, w1 + r, 0], ["L", u2, w2 - r], ["A", r, u2 - r, w2, 0], ["L", u1 + r, w2], ["A", r, u1, w2 - r, 0], ["L", u1, w1 + r], ["A", r, u1 + r, w1, 0], ["Z"],
  ];
  const ring2: Seg[] = [...seg(box.xMin, box.xMax, box.yMin, box.yMax, p.cornerRadius), ...seg(cav.xMin, cav.xMax, cav.yMin, cav.yMax, p.cornerRadius - wall)];
  return (
    <Sheet info={info(version, "DT-05", "M1 Suporte: cortes A–A e B–B", "M1 支架：剖视 A–A 与 B–B", "M1", "1:2 · 1:1", sheet, total)}>
      <Solid v={a} ds={[shell, profileSegs(g, col.top)]} />
      <Void v={a} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w1={cav.top} w2={roofTop} open="tb" />
      <Void v={a} u1={-seat.diameter / 2} u2={seat.diameter / 2} w1={cav.top} w2={seat.top} open="b" />
      <Void v={a} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w1={roofTop - p.channelDepth} w2={roofTop} open="t" />
      <Void v={a} u1={col.yMin} u2={col.yMax} w1={win.zMin} w2={win.zMax} open="lr" />
      <Ctr v={a} u={0} w={110} len={118} only="v" />
      <DimV v={a} w1={0} w2={col.top} u={box.yMin} off={-10} />
      <DimV v={a} w1={win.zMin} w2={win.zMax} u={col.yMax} off={-10} text={`janela ${f(win.zMax - win.zMin)}`} />
      <DimV v={a} w1={0} w2={win.zMin} u={col.yMax} off={-24} />
      <DimV v={a} w1={ring.bottom} w2={ring.top} u={g.bore} off={12} text={f(p.ringHeight)} />
      <DimH v={a} u1={box.yMin} u2={box.yMax} w={0} off={-7} />
      <DimH v={a} u1={col.yMin} u2={col.yMax} w={col.top} off={6} />
      <DimH v={a} u1={-g.bore} u2={g.bore} w={ring.top} off={14} text={`furo ⌀${f(g.bore * 2)} (*)`} />
      <Lead v={a} at={[0, 38.8]} dx={30} dy={-30} text="teto: ver detalhe na folha M4 · 顶板详见 M4 图" />
      <Lead v={a} at={[col.yMin - 4, ring.bottom - 6]} dx={20} dy={10} text={`R${f(p.columnRound)}`} />
      <CutMark v={b} a={[0, box.yMin - 8]} b={[0, box.yMax + 8]} letter="A" dir={[1, 0]} />
      <ViewTitle x={a.ox - 6} y={146} text="Corte A–A (x = 0) · 剖视 A–A" scale="1:2" />
      {/* B-B */}
      <Solid v={b} ds={[ring2]} evenodd />
      {L.posts.map((q, i) => <Solid key={i} v={b} ds={[[...circleSegs(q.x, q.y, 4), ...circleSegs(q.x, q.y, p.pilotHole / 2)]]} evenodd />)}
      <Void v={b} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w1={box.yMin} w2={box.yMin + wall} open="tb" />
      {g.v2 && <Void v={b} u1={p.knobX - p.knobDiameter / 2} u2={p.knobX + p.knobDiameter / 2} w1={box.yMin} w2={box.yMin + wall} open="tb" />}
      {g.v2 && <Void v={b} u1={box.xMax - wall} u2={box.xMax} w1={p.jackY - p.jackDiameter / 2} w2={p.jackY + p.jackDiameter / 2} open="lr" />}
      <Ctr v={b} u={0} w={0} len={6} />
      <DimH v={b} u1={box.xMin} u2={box.xMax} w={box.yMin} off={-7} />
      <DimV v={b} w1={box.yMin} w2={box.yMax} u={box.xMax} off={9} />
      <DimH v={b} u1={L.posts[0]!.x} u2={L.posts[2]!.x} w={L.posts[0]!.y} off={-14} text={`${f(L.posts[2]!.x - L.posts[0]!.x)}`} />
      <DimV v={b} w1={L.posts[0]!.y} w2={L.posts[1]!.y} u={L.posts[0]!.x} off={-7} />
      <DimH v={b} u1={sw.x - sw.width / 2} u2={sw.x + sw.width / 2} w={box.yMin + wall} off={-20} text={`${f(sw.width)} (*)`} />
      {g.v2 && <DimH v={b} u1={p.knobX - p.knobDiameter / 2} u2={p.knobX + p.knobDiameter / 2} w={box.yMin + wall} off={-20} text={`⌀${f(p.knobDiameter)} (*)`} />}
      {g.v2 && <DimV v={b} w1={p.jackY - p.jackDiameter / 2} w2={p.jackY + p.jackDiameter / 2} u={box.xMax} off={-14} text={`⌀${f(p.jackDiameter)} (*)`} />}
      <Lead v={b} at={[L.posts[3]!.x + 4, L.posts[3]!.y]} dx={-3} dy={-12} text={`4× ⌀8, piloto ⌀${f(p.pilotHole)} (*)`} />
      <Lead v={b} at={[box.xMin, box.yMax - 3]} dx={-8} dy={-8} text={`parede ${f(wall)}`} />
      <CutMark v={a} a={[box.yMin - 8, 20]} b={[box.yMax + 8, 20]} letter="B" dir={[0, 1]} />
      <ViewTitle x={b.ox} y={150} text="Corte B–B (z = 20) · 剖视 B–B" scale="1:1" />
    </Sheet>
  );
}

/** ---------- sheet 6: M1 details ---------- */
function M1Detalhes({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, R, bore, earX, earHalf, ring, arm, sw, box } = g;
  const v: V = { ox: 70, oy: 92, s: 1.6 };
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
    <Sheet info={info(version, "DT-06", "M1: detalhe do anel e recortes", "M1 支架：抱箍环详图与开孔表", "M1", "1,6:1", sheet, total)}>
      <Solid
        v={v}
        ds={[
          rectSegs(-22, 22, 0, armLen),
          rectSegs(earX - earHalf, earX + earHalf, 0, 10),
          rectSegs(-earX - earHalf, -earX + earHalf, 0, 10),
        ]}
      />
      <VoidShape v={v} segs={[["M", -bore, 0], ["A", bore, bore, 0, 1], ["Z"]]} />
      <Void v={v} u1={earX - 1.3} u2={earX + 1.3} w1={-0.5} w2={8} open="b" />
      <Void v={v} u1={-earX - 1.3} u2={-earX + 1.3} w1={-0.5} w2={8} open="b" />
      <Ctr v={v} u={0} w={0} len={30} only="h" />
      <Line v={v} a={[0, -6]} b={[0, armLen + 4]} c="ctr" />
      <Line v={v} a={[earX, -6]} b={[earX, 14]} c="ctr" />
      <Line v={v} a={[-earX, -6]} b={[-earX, 14]} c="ctr" />
      <Line v={v} a={[-34, 0]} b={[34, 0]} c="thin" />
      <DimH v={v} u1={-bore} u2={bore} w={0} off={-8} text={`⌀${f(bore * 2)} (*)`} />
      <DimH v={v} u1={-earX - earHalf} u2={earX + earHalf} w={0} off={-18} />
      <DimH v={v} u1={-earX} u2={earX} w={10} off={6} text={`${f(earX * 2)} (entre eixos)`} />
      <DimH v={v} u1={-22} u2={22} w={armLen} off={6} />
      <DimV v={v} w1={0} w2={10} u={earX + earHalf} off={8} text={f(10)} />
      <DimV v={v} w1={0} w2={armLen} u={22} off={20} text={f(armLen)} />
      <DimH v={v} u1={earX - earHalf} u2={earX + earHalf} w={10} off={14} text={f(earHalf * 2)} />
      <Lead v={v} at={[earX, 4]} dx={20} dy={14} text={`piloto ⌀${f(p.pilotHole)} (*) × 8`} />
      <Lead v={v} at={[-R, 6]} dx={-10} dy={-14} text={`R ext. ${f(R)}`} />
      <ViewTitle x={v.ox} y={150} text="Detalhe E: planta do anel em z = 199,2 · 局部详图 E（z = 199.2 平面）" scale="1,6:1" />
      <g className="dt-table">
        <text className="dt-t dt-tnh" x={150} y={16}>Tabela de recortes e furos do M1 · M1 开孔表</text>
        <line className="dt-thin" x1={150} x2={290} y1={18.5} y2={18.5} />
        {rows.map(([a, b, c], i) => (
          <g key={a}>
            <text className="dt-t dt-tv" x={150} y={25 + i * 13}>{a}</text>
            <text className="dt-t dt-tn" x={150} y={29.8 + i * 13}>{b}</text>
            <text className="dt-t dt-tn dt-tzh" x={150} y={34 + i * 13}>{c}</text>
          </g>
        ))}
        <text className="dt-t dt-tn" x={150} y={26 + rows.length * 13}>(*) valor a confirmar com os gabaritos G1 a G3. · 以校准件 G1~G3 核实。</text>
        <text className="dt-t dt-tn" x={150} y={31 + rows.length * 13}>Coordenadas no sistema da capa: x = 0, y = 0 no eixo do tubo, z = 0 no piso.</text>
      </g>
    </Sheet>
  );
}

/** ---------- sheet 7: M2 clamp ---------- */
function M2Abracadeira({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { p, R, bore, earX, earHalf, ring } = g;
  const gap = ring.gap;
  const zc = ring.bottom + p.ringHeight / 2;
  const front: V = { ox: 90, oy: 24 + ring.top * 2, s: 2 };
  const plan: V = { ox: 90, oy: 100, s: 2 };
  const solidCap: Seg[] = [
    ["M", -Math.sqrt(R * R - gap * gap), -gap], ["A", R, Math.sqrt(R * R - gap * gap), -gap, 0], ["L", Math.sqrt(bore * bore - gap * gap), -gap],
    ["A", bore, -Math.sqrt(bore * bore - gap * gap), -gap, 1], ["Z"],
  ];
  const ear = (sx: 1 | -1) => rectSegs(sx * earX - earHalf, sx * earX + earHalf, -gap - 10, -gap + 0.5);
  return (
    <Sheet info={info(version, "DT-07", "M2 Abraçadeira do tubo (metade removível)", "M2 镜筒抱箍（可拆半环）", "M2", "2:1", sheet, total)}>
      {/* front (from -y) */}
      <Rect v={front} u1={-R} u2={R} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={earX - earHalf} u2={earX + earHalf} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={-earX - earHalf} u2={-earX + earHalf} w1={ring.bottom} w2={ring.top} />
      <Rect v={front} u1={-bore} u2={bore} w1={ring.bottom} w2={ring.top} c="hid" />
      <Circ v={front} u={earX} w={zc} r={p.screwHole / 2} />
      <Circ v={front} u={-earX} w={zc} r={p.screwHole / 2} />
      <Ctr v={front} u={earX} w={zc} len={5} />
      <Ctr v={front} u={-earX} w={zc} len={5} />
      <Line v={front} a={[0, ring.bottom - 3]} b={[0, ring.top + 3]} c="ctr" />
      <DimH v={front} u1={-earX - earHalf} u2={earX + earHalf} w={ring.top} off={9} />
      <DimH v={front} u1={-R} u2={R} w={ring.top} off={19} text={`⌀${f(R * 2)}`} />
      <DimV v={front} w1={ring.bottom} w2={ring.top} u={-earX - earHalf} off={-9} text={f(p.ringHeight)} />
      <Lead v={front} at={[earX, zc]} dx={26} dy={-14} text={`2× ⌀${f(p.screwHole)} passante`} />
      <Lead v={front} at={[earX, zc - 2]} dx={26} dy={16} text={`entre eixos ${f(earX * 2)}`} dot={false} />
      <ViewTitle x={front.ox} y={78} text="Vista frontal · 正视图" scale="2:1" />
      {/* section at z = ear axis, seen from above */}
      <Solid v={plan} ds={[solidCap, ear(1), ear(-1)]} />
      <VoidShape v={plan} segs={rectSegs(earX - p.screwHole / 2, earX + p.screwHole / 2, -gap - 11, -gap + 1)} />
      <VoidShape v={plan} segs={rectSegs(-earX - p.screwHole / 2, -earX + p.screwHole / 2, -gap - 11, -gap + 1)} />
      <Line v={plan} a={[-34, 0]} b={[34, 0]} c="thin" />
      <Line v={plan} a={[0, 4]} b={[0, -R - 4]} c="ctr" />
      <Line v={plan} a={[earX, -gap + 2]} b={[earX, -gap - 14]} c="ctr" />
      <Line v={plan} a={[-earX, -gap + 2]} b={[-earX, -gap - 14]} c="ctr" />
      <DimV v={plan} w1={-R} w2={-gap} u={-R} off={-8} text={f(R - gap)} />
      <DimV v={plan} w1={-gap - 10} w2={-gap} u={earX + earHalf} off={9} text={f(10)} />
      <DimV v={plan} w1={-gap} w2={0} u={R + 2} off={22} text={f(gap)} />
      <DimH v={plan} u1={-bore} u2={bore} w={-gap} off={-4} text={`⌀${f(bore * 2)} (*)`} />
      <DimH v={plan} u1={bore} u2={R} w={-R - 1} off={-6} text={f(p.ringWall)} />
      <DimH v={plan} u1={earX - earHalf} u2={earX + earHalf} w={-gap - 10} off={-6} text={f(earHalf * 2)} />
      <Lead v={plan} at={[0, -R]} dx={-34} dy={4} text="R ext. 20,85" />
      <CutMark v={front} a={[-earX - earHalf - 6, zc]} b={[earX + earHalf + 6, zc]} letter="C" dir={[0, -1]} />
      <ViewTitle x={plan.ox} y={151} text="Corte C–C (z = 199,2) · 剖视 C–C" scale="2:1" />
      <g className="dt-table">
        <text className="dt-t dt-tnh" x={170} y={16}>Orientação de impressão · 打印方向</text>
        <text className="dt-t dt-tn" x={170} y={22}>Arquivo abracadeira-tubo-impressao.stl (abre para cima), sem suportes.</text>
        <text className="dt-t dt-tn dt-tzh" x={170} y={26}>使用 abracadeira-tubo-impressao.stl（开口朝上），无需支撑。</text>
        <text className="dt-t dt-tnh" x={170} y={38}>Montagem · 装配</text>
        <text className="dt-t dt-tn" x={170} y={44}>2× parafuso M3 × 16 (H2) atravessam as orelhas e entram 8 mm</text>
        <text className="dt-t dt-tn" x={170} y={48}>no piloto ⌀{f(p.pilotHole)} do M1. Folga de {f(gap)} mm entre as metades.</text>
        <text className="dt-t dt-tn dt-tzh" x={170} y={52}>2 颗 M3 × 16 螺钉 (H2) 穿过耳部，拧入 M1 的 ⌀{f(p.pilotHole)} 底孔 8 mm。两半环间隙 {f(gap)} mm。</text>
        <text className="dt-t dt-tnh" x={170} y={64}>Furo do tubo · 镜筒孔</text>
        <text className="dt-t dt-tn" x={170} y={70}>⌀{f(bore * 2)} (*) = tubo medido {f(p.tubeDiameter)} + folga {f(p.boreClearance)}.</text>
        <text className="dt-t dt-tn" x={170} y={74}>Confirmar no gabarito G1 antes de imprimir em série.</text>
      </g>
    </Sheet>
  );
}

/** ---------- sheet 8: M3 lid ---------- */
function M3Tampa({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, wall } = g;
  const post = L.ledPost;
  const plan: V = { ox: 60, oy: 100, s: 1 };
  const cc: V = { ox: 206, oy: 104, s: 1, fx: -1 };
  const dd: V = { ox: 206, oy: 142, s: 1 };
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
  return (
    <Sheet info={info(version, "DT-08", "M3 Tampa de fundo", "M3 底盖", "M3", "1:1", sheet, total)}>
      <Shape v={plan} segs={[
        ["M", box.xMin + p.cornerRadius, box.yMin], ["L", box.xMax - p.cornerRadius, box.yMin], ["A", p.cornerRadius, box.xMax, box.yMin + p.cornerRadius, 0], ["L", box.xMax, box.yMax - p.cornerRadius],
        ["A", p.cornerRadius, box.xMax - p.cornerRadius, box.yMax, 0], ["L", box.xMin + p.cornerRadius, box.yMax], ["A", p.cornerRadius, box.xMin, box.yMax - p.cornerRadius, 0], ["L", box.xMin, box.yMin + p.cornerRadius],
        ["A", p.cornerRadius, box.xMin + p.cornerRadius, box.yMin, 0], ["Z"],
      ]} />
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
      <DimH v={plan} u1={L.lid.holes[0]!.x} u2={L.lid.holes[2]!.x} w={L.lid.holes[0]!.y} off={-3} text={f(L.lid.holes[2]!.x * 2)} />
      <DimV v={plan} w1={L.lid.holes[0]!.y} w2={L.lid.holes[1]!.y} u={L.lid.holes[2]!.x} off={8} text={f(L.lid.holes[1]!.y - L.lid.holes[0]!.y)} />
      <DimH v={plan} u1={L.boardPosts[0]!.x} u2={L.boardPosts[2]!.x} w={L.boardPosts[0]!.y} off={-3} text={f(L.boardPosts[2]!.x - L.boardPosts[0]!.x)} />
      <DimV v={plan} w1={L.boardPosts[0]!.y} w2={L.boardPosts[1]!.y} u={L.boardPosts[0]!.x} off={-8} text={f(L.boardPosts[1]!.y - L.boardPosts[0]!.y)} />
      {L.cradle && <DimV v={plan} w1={L.cradle.yMin} w2={L.cradle.yMax} u={L.cradle.xMax} off={8} text={f(L.cradle.yMax - L.cradle.yMin)} />}
      {L.cradle && <DimH v={plan} u1={L.cradle.xMin} u2={L.cradle.xMax} w={L.cradle.yMax} off={6} text={f(L.cradle.xMax - L.cradle.xMin)} />}
      <Lead v={plan} at={[post.diameter / 2, 3]} dx={16} dy={-12} text={`⌀${f(post.diameter)} / assento ⌀${f(post.seatDiameter)} (*)`} />
      <Lead v={plan} at={[board.xMax, board.yMax]} dx={14} dy={-8} text="contorno da PCB1" dot={false} />
      <Lead v={plan} at={[box.xMin + 4, box.yMin + 4]} dx={-6} dy={14} text={`R${f(p.cornerRadius)}`} />
      <CutMark v={dd} a={[box.xMin - 8, 0]} b={[box.xMax + 8, 0]} letter="C" dir={[0, 1]} />
      <CutMark v={plan} a={[box.xMin - 8, bpy]} b={[box.xMax + 8, bpy]} letter="D" dir={[0, 1]} />
      <CutMark v={plan} a={[0, box.yMin - 5]} b={[0, box.yMax + 5]} letter="C" dir={[-1, 0]} />
      <ViewTitle x={plan.ox} y={158} text="Vista superior · 俯视图（打印方向）" scale="1:1" />
      {/* C-C */}
      <Solid v={cc} ds={[rectSegs(box.yMin, box.yMax, -wall, 0), rectSegs(-post.diameter / 2, post.diameter / 2, -0.2, post.top), ...(L.cradle ? [rectSegs(L.cradle.yMin, L.cradle.yMin + p.cradleWall, 0, L.cradle.height), rectSegs(L.cradle.yMax - p.cradleWall, L.cradle.yMax, 0, L.cradle.height)] : [])]} />
      <Void v={cc} u1={-post.seatDiameter / 2} u2={post.seatDiameter / 2} w1={post.top - post.seatDepth} w2={post.top} open="t" />
      <Void v={cc} u1={-post.legHole / 2} u2={post.legHole / 2} w1={1} w2={post.top - post.seatDepth} />
      <Void v={cc} u1={post.slot.dir > 0 ? 0 : -(post.diameter / 2 + 1)} u2={post.slot.dir > 0 ? post.diameter / 2 + 1 : 0} w1={0} w2={post.slot.height} open="b" />
      <Line v={cc} a={[0, -wall - 3]} b={[0, post.top + 5]} c="ctr" />
      <DimV v={cc} w1={-wall} w2={0} u={box.yMin} off={-6} text={f(wall)} />
      <DimV v={cc} w1={0} w2={post.top} u={post.diameter / 2} off={-14} u2={-post.diameter / 2} text={`${f(post.top)}`} />
      <DimV v={cc} w1={0} w2={post.slot.height} u={dir(post, post.diameter / 2 + 1)} off={dirOff(post)} text={f(post.slot.height)} />
      {L.cradle && <DimV v={cc} w1={0} w2={L.cradle.height} u={L.cradle.yMax} off={-8} text={f(L.cradle.height)} />}
      <DimH v={cc} u1={-post.diameter / 2} u2={post.diameter / 2} w={post.top} off={5} text={`⌀${f(post.diameter)}`} />
      <ViewTitle x={cc.ox - 20} y={115} text="Corte C–C (x = 0) · 剖视 C–C" scale="1:1" />
      {/* D-D */}
      <Solid v={dd} ds={[rectSegs(box.xMin, box.xMax, -wall, 0), ...L.boardPosts.filter((q) => Math.abs(q.y - L.boardPosts[0]!.y) < 0.1 || Math.abs(q.y - L.boardPosts[1]!.y) < 0.1).slice(0, 2).map((q) => rectSegs(q.x - 3.5, q.x + 3.5, -0.2, board.standoffHeight))]} />
      {L.boardPosts.slice(0, 1).concat(L.boardPosts.slice(2, 3)).map((q, i) => <Void key={i} v={dd} u1={q.x - p.pilotHole / 2} u2={q.x + p.pilotHole / 2} w1={1} w2={board.standoffHeight} open="t" />)}
      <Rect v={dd} u1={board.xMin} u2={board.xMax} w1={board.standoffHeight} w2={board.standoffHeight + 1.6} fill="#cdeedb" />
      <DimV v={dd} w1={0} w2={board.standoffHeight} u={L.boardPosts[2]!.x + 3.5} off={8} text={f(board.standoffHeight)} />
      <DimH v={dd} u1={L.boardPosts[0]!.x - 3.5} u2={L.boardPosts[0]!.x + 3.5} w={board.standoffHeight} off={6} text="⌀7" />
      <ViewTitle x={dd.ox} y={153} text={`Corte D–D (y = ${f(bpy)}) · 剖视 D–D`} scale="1:1" />
      <Table rows={rowsH} x={128} y={22} />
    </Sheet>
  );
}

function dir(post: HolderLayout["ledPost"], reach: number) {
  return post.slot.dir > 0 ? reach : -reach;
}
function dirOff(post: HolderLayout["ledPost"]) {
  return post.slot.dir > 0 ? -8 : 8;
}

function Table({ rows, x, y }: { rows: [string, string, string][]; x: number; y: number }) {
  return (
    <g className="dt-table">
      <line className="dt-thin" x1={x} x2={x + 160} y1={y - 3} y2={y - 3} />
      {rows.map(([a, b, c], i) => (
        <g key={a}>
          <text className="dt-t dt-tv" x={x} y={y + 2.5 + i * 8.5}>{a}</text>
          <text className="dt-t dt-tn" x={x} y={y + 6 + i * 8.5}>{b}</text>
          <text className="dt-t dt-tn dt-tzh" x={x + 88} y={y + 6 + i * 8.5}>{c}</text>
        </g>
      ))}
    </g>
  );
}

/** ---------- sheet 9: M4 diffuser and its seat ---------- */
function M4Difusor({ g, version, sheet, total }: { g: G; version: SuporteVersion; sheet: number; total: number }) {
  const { L, p, box, cav } = g;
  const seat = L.diffuserSeat;
  const disc: V = { ox: 70, oy: 70, s: 3 };
  const discTop: V = { ox: 70, oy: 128, s: 3 };
  const det: V = { ox: 214, oy: 150 - 13 * 5, s: 5 };
  const roofTop = box.height;
  return (
    <Sheet info={info(version, "DT-09", "M4 Difusor e assento no teto do M1", "M4 扩散片及 M1 顶板凹槽", "M4", "3:1 · 5:1", sheet, total)}>
      <Rect v={disc} u1={-13} u2={13} w1={0} w2={p.diffuserThickness} />
      <Line v={disc} a={[0, -2]} b={[0, 3]} c="ctr" />
      <DimH v={disc} u1={-13} u2={13} w={p.diffuserThickness} off={7} text={`⌀${f(p.diffuserDiameter)}`} />
      <DimV v={disc} w1={0} w2={p.diffuserThickness} u={13} off={9} text={f(p.diffuserThickness)} />
      <ViewTitle x={disc.ox} y={82} text="Vista frontal · 正视图" scale="3:1" />
      <Circ v={discTop} u={0} w={0} r={13} />
      <Ctr v={discTop} u={0} w={0} len={16} />
      <Dia v={discTop} u={0} w={0} r={13} ang={-40} len={16} text={`⌀${f(p.diffuserDiameter)}`} />
      <ViewTitle x={discTop.ox} y={162} text="Vista superior · 俯视图" scale="3:1" />
      {/* seat detail */}
      <Solid v={det} ds={[rectSegs(-14, 14, cav.top, roofTop)]} />
      <Void v={det} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w1={cav.top} w2={roofTop} open="tb" />
      <Void v={det} u1={-seat.diameter / 2} u2={seat.diameter / 2} w1={cav.top} w2={seat.top} open="b" />
      <Void v={det} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w1={roofTop - p.channelDepth} w2={roofTop} open="t" />
      <Solid v={det} ds={[rectSegs(-p.diffuserDiameter / 2, p.diffuserDiameter / 2, 37.8, 37.8 + p.diffuserThickness)]} />
      <Circ v={det} u={-p.diffuserDiameter / 2} w={37.8 + p.diffuserThickness} r={0.35} fill="#ffe08a" />
      <Circ v={det} u={p.diffuserDiameter / 2} w={37.8 + p.diffuserThickness} r={0.35} fill="#ffe08a" />
      <DimV v={det} w1={cav.top} w2={roofTop} u={-14} off={-8} text={`${f(p.wall)} (teto)`} />
      <DimV v={det} w1={cav.top} w2={seat.top} u={seat.diameter / 2} off={26} text={`${f(seat.top - cav.top)} (assento)`} />
      <DimV v={det} w1={roofTop - p.channelDepth} w2={roofTop} u={14} off={9} text={`${f(p.channelDepth)} (canal)`} />
      <DimH v={det} u1={-p.ledWindowDiameter / 2} u2={p.ledWindowDiameter / 2} w={roofTop} off={10} text={`janela ⌀${f(p.ledWindowDiameter)}`} />
      <DimH v={det} u1={-seat.diameter / 2} u2={seat.diameter / 2} w={cav.top} off={-9} text={`assento ⌀${f(seat.diameter)} (*)`} />
      <DimH v={det} u1={-(p.slideWidth + p.slideFit) / 2} u2={(p.slideWidth + p.slideFit) / 2} w={roofTop} off={18} text={`canal ${f(p.slideWidth + p.slideFit)} (*)`} />
      <Lead v={det} at={[-p.diffuserDiameter / 2, 38.2]} dx={-22} dy={22} text="M4 (hachurado) · 扩散片" />
      <Lead v={det} at={[p.diffuserDiameter / 2, 38.2]} dx={20} dy={30} text="cola quente W3 · 热熔胶" />
      <ViewTitle x={det.ox} y={166} text="Detalhe G: teto do M1 em corte · 局部详图 G" scale="5:1" />
      <g className="dt-table">
        <text className="dt-t dt-tnh" x={128} y={16}>Material e cor · 材料与颜色</text>
        <text className="dt-t dt-tn" x={128} y={22}>PLA natural ou branco, 1 a 2 camadas de 0,2 mm (≈ 0,8 mm). Sem suportes.</text>
        <text className="dt-t dt-tn dt-tzh" x={128} y={26}>本色或白色 PLA，1~2 层 0.2 mm（约 0.8 mm）。无需支撑。</text>
      </g>
    </Sheet>
  );
}

export function Desenhos({ version }: { version: SuporteVersion }): ReactNode {
  const g = useMemo(() => geometry(version), [version]);
  const sheets = [Conjunto, PlantaInterior, CorteLongitudinal, M1Externa, M1Cortes, M1Detalhes, M2Abracadeira, M3Tampa, M4Difusor];
  return (
    <>
      {sheets.map((S, i) => (
        <section className="sheet drawing" key={i}>
          <S g={g} version={version} sheet={i + 1} total={sheets.length} />
        </section>
      ))}
    </>
  );
}

export const DRAWING_SHEETS = 9;
