/**
 * Small toolkit for the technical drawings of the manual: first-angle sheets in paper millimetres, hatched sections,
 * dimension lines, leaders and a title block. Every function maps model millimetres to the sheet with a view `V`.
 */
import type { ReactNode } from "react";

export interface V {
  /** Sheet position of the model origin. */
  ox: number;
  oy: number;
  /** Paper millimetres per model millimetre. */
  s: number;
  /** -1 mirrors the horizontal axis (side views where +y runs to the left). */
  fx?: 1 | -1;
}

export const px = (v: V, u: number) => v.ox + (v.fx ?? 1) * u * v.s;
export const py = (v: V, w: number) => v.oy - w * v.s;
export const f = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export type Seg = ["M" | "L", number, number] | ["A", number, number, number, 0 | 1] | ["Z"];

/** Path of model-space segments; an arc is ["A", radius, u, w, sweep] with sweep as seen on paper for an unmirrored view. */
export function pathD(v: V, segs: Seg[]): string {
  return segs
    .map((g) => {
      if (g[0] === "Z") return "Z";
      if (g[0] === "A") {
        const sweep = (v.fx ?? 1) < 0 ? 1 - g[4] : g[4];
        return `A${g[1] * v.s} ${g[1] * v.s} 0 0 ${sweep} ${px(v, g[2])} ${py(v, g[3])}`;
      }
      return `${g[0]}${px(v, g[1])} ${py(v, g[2])}`;
    })
    .join(" ");
}

export const rectSegs = (u1: number, u2: number, w1: number, w2: number): Seg[] => [["M", u1, w1], ["L", u2, w1], ["L", u2, w2], ["L", u1, w2], ["Z"]];

/** Rectangle with rounded corners of radius r. */
export function roundedRectSegs(u1: number, u2: number, w1: number, w2: number, r: number): Seg[] {
  return [
    ["M", u1 + r, w1], ["L", u2 - r, w1], ["A", r, u2, w1 + r, 0], ["L", u2, w2 - r], ["A", r, u2 - r, w2, 0],
    ["L", u1 + r, w2], ["A", r, u1, w2 - r, 0], ["L", u1, w1 + r], ["A", r, u1 + r, w1, 0], ["Z"],
  ];
}

type Cls = "vis" | "hid" | "ctr" | "thin";

export function Line({ v, a, b, c = "vis" }: { v: V; a: [number, number]; b: [number, number]; c?: Cls }) {
  return <line className={`dt-${c}`} x1={px(v, a[0])} y1={py(v, a[1])} x2={px(v, b[0])} y2={py(v, b[1])} />;
}

export function Rect({ v, u1, u2, w1, w2, c = "vis", r = 0, fill }: { v: V; u1: number; u2: number; w1: number; w2: number; c?: Cls; r?: number; fill?: string }) {
  return <path className={`dt-${c}`} d={pathD(v, r > 0 ? roundedRectSegs(u1, u2, w1, w2, r) : rectSegs(u1, u2, w1, w2))} style={fill ? { fill } : undefined} />;
}

export function Shape({ v, segs, c = "vis", fill }: { v: V; segs: Seg[]; c?: Cls; fill?: string }) {
  return <path className={`dt-${c}`} d={pathD(v, segs)} style={fill ? { fill } : undefined} />;
}

export function Circ({ v, u, w, r, c = "vis", fill }: { v: V; u: number; w: number; r: number; c?: Cls; fill?: string }) {
  return <circle className={`dt-${c}`} cx={px(v, u)} cy={py(v, w)} r={r * v.s} style={fill ? { fill } : undefined} />;
}

/** Centre lines through (u, w), `len` model millimetres each side. */
export function Ctr({ v, u, w, len, only }: { v: V; u: number; w: number; len: number; only?: "h" | "v" }) {
  return (
    <g>
      {only !== "v" && <Line v={v} a={[u - len, w]} b={[u + len, w]} c="ctr" />}
      {only !== "h" && <Line v={v} a={[u, w - len]} b={[u, w + len]} c="ctr" />}
    </g>
  );
}

/** Solid areas of a section: outline only on the union boundary, then white, then hatch. */
export function Solid({ v, ds, evenodd = false }: { v: V; ds: Seg[][]; evenodd?: boolean }) {
  const paths = ds.map((s) => pathD(v, s));
  const rule = evenodd ? "evenodd" : "nonzero";
  return (
    <g>
      <g fill="#111" fillRule={rule} stroke="#111" strokeWidth={0.7} strokeLinejoin="round">{paths.map((d, i) => <path key={i} d={d} />)}</g>
      <g fill="#fff" fillRule={rule}>{paths.map((d, i) => <path key={i} d={d} />)}</g>
      <g fill="url(#dt-hatch)" fillRule={rule}>{paths.map((d, i) => <path key={i} d={d} />)}</g>
    </g>
  );
}

export const circleSegs = (u: number, w: number, r: number): Seg[] => [["M", u + r, w], ["A", r, u - r, w, 1], ["A", r, u + r, w, 1], ["Z"]];

/** A hole of any shape in a section: white with its edge drawn. */
export function VoidShape({ v, segs }: { v: V; segs: Seg[] }) {
  return <path className="dt-vis" d={pathD(v, segs)} style={{ fill: "#fff" }} />;
}

/** A hole or cut-out in a section: white, edges drawn except on the open sides ("t", "b", "l", "r"). */
export function Void({ v, u1, u2, w1, w2, open = "" }: { v: V; u1: number; u2: number; w1: number; w2: number; open?: string }) {
  const hasT = !open.includes("t");
  const hasB = !open.includes("b");
  const hasL = !open.includes("l");
  const hasR = !open.includes("r");
  const [a, b, c, d] = [px(v, u1), px(v, u2), py(v, w1), py(v, w2)];
  const [xl, xr] = a < b ? [a, b] : [b, a];
  const [yb, yt] = c > d ? [c, d] : [d, c];
  // paper: xl..xr, yt (top) .. yb (bottom). Which model side is "left" follows the mirroring.
  const mirrored = (v.fx ?? 1) < 0;
  const leftOpen = mirrored ? !hasR : !hasL;
  const rightOpen = mirrored ? !hasL : !hasR;
  return (
    <g>
      <rect x={xl} y={yt} width={xr - xl} height={yb - yt} fill="#fff" />
      {hasT && <line className="dt-vis" x1={xl} x2={xr} y1={yt} y2={yt} />}
      {hasB && <line className="dt-vis" x1={xl} x2={xr} y1={yb} y2={yb} />}
      {!leftOpen && <line className="dt-vis" x1={xl} x2={xl} y1={yt} y2={yb} />}
      {!rightOpen && <line className="dt-vis" x1={xr} x2={xr} y1={yt} y2={yb} />}
    </g>
  );
}

const GAP = 0.8;
const OVER = 1.6;

/** Horizontal dimension of u1..u2 measured at height w; `off` is the paper distance of the dimension line (+ up). */
export function DimH({ v, u1, u2, w, off, text, w2 }: { v: V; u1: number; u2: number; w: number; off: number; text?: string; w2?: number }) {
  const x1 = px(v, u1);
  const x2 = px(v, u2);
  const y1 = py(v, w);
  const y2 = py(v, w2 ?? w);
  const y = Math.min(y1, y2) - off;
  const sg = off >= 0 ? -1 : 1;
  const yStart = (yy: number) => (off >= 0 ? Math.min(yy, y1, y2) - GAP : Math.max(yy, y1, y2) + GAP);
  return (
    <g className="dt-dimg">
      <line className="dt-dim" x1={x1} x2={x1} y1={yStart(y1)} y2={y + sg * OVER} />
      <line className="dt-dim" x1={x2} x2={x2} y1={yStart(y2)} y2={y + sg * OVER} />
      <line className="dt-dim" x1={x1} x2={x2} y1={y} y2={y} markerStart="url(#dt-arr)" markerEnd="url(#dt-arr)" />
      <text className="dt-t dt-tdim" x={(x1 + x2) / 2} y={y - 0.8} textAnchor="middle">{text ?? f(Math.abs(u2 - u1))}</text>
    </g>
  );
}

/** Vertical dimension of w1..w2 measured at u; `off` is the paper distance (+ right). */
export function DimV({ v, w1, w2, u, off, text, u2 }: { v: V; w1: number; w2: number; u: number; off: number; text?: string; u2?: number }) {
  const y1 = py(v, w1);
  const y2 = py(v, w2);
  const x1 = px(v, u);
  const x2 = px(v, u2 ?? u);
  const x = (off >= 0 ? Math.max(x1, x2) : Math.min(x1, x2)) + off;
  const sg = off >= 0 ? 1 : -1;
  const xStart = (xx: number) => (off >= 0 ? Math.max(xx, x1, x2) + GAP : Math.min(xx, x1, x2) - GAP);
  return (
    <g className="dt-dimg">
      <line className="dt-dim" y1={y1} y2={y1} x1={xStart(x1)} x2={x + sg * OVER} />
      <line className="dt-dim" y1={y2} y2={y2} x1={xStart(x2)} x2={x + sg * OVER} />
      <line className="dt-dim" x1={x} x2={x} y1={y1} y2={y2} markerStart="url(#dt-arr)" markerEnd="url(#dt-arr)" />
      <text className="dt-t dt-tdim" transform={`translate(${x - 0.8} ${(y1 + y2) / 2}) rotate(-90)`} textAnchor="middle">{text ?? f(Math.abs(w2 - w1))}</text>
    </g>
  );
}

/** Leader from a model point to a label placed `dx`, `dy` paper millimetres away (dy < 0 goes up). */
export function Lead({ v, at, dx, dy, text, dot = true }: { v: V; at: [number, number]; dx: number; dy: number; text: string; dot?: boolean }) {
  const x = px(v, at[0]);
  const y = py(v, at[1]);
  const right = dx >= 0;
  return (
    <g className="dt-dimg">
      <line className="dt-dim" x1={x} y1={y} x2={x + dx} y2={y + dy} />
      <line className="dt-dim" x1={x + dx} y1={y + dy} x2={x + dx + (right ? 4 : -4)} y2={y + dy} />
      {dot && <circle cx={x} cy={y} r={0.5} fill="#0b4fa8" />}
      <text className="dt-t dt-tdim" x={x + dx + (right ? 4.6 : -4.6)} y={y + dy + 0.9} textAnchor={right ? "start" : "end"}>{text}</text>
    </g>
  );
}

/** Diameter callout on a circle at `ang` degrees (math orientation). */
export function Dia({ v, u, w, r, ang, len = 9, text }: { v: V; u: number; w: number; r: number; ang: number; len?: number; text: string }) {
  const rad = (ang * Math.PI) / 180;
  const sx = (v.fx ?? 1) * Math.cos(rad);
  return <Lead v={v} at={[u + r * Math.cos(rad), w + r * Math.sin(rad)]} dx={Math.sign(sx || 1) * len * Math.abs(Math.cos(rad) || 0.7)} dy={-len * Math.sin(rad) * 0.9} text={text} />;
}

/** Numbered balloon with a leader to a model point; the balloon sits at paper offset (dx, dy). */
export function Balloon({ v, at, dx, dy, id }: { v: V; at: [number, number]; dx: number; dy: number; id: string }) {
  const x = px(v, at[0]);
  const y = py(v, at[1]);
  const r = id.length > 2 ? 4.2 : 3.6;
  return (
    <g className="dt-balloon">
      <line x1={x} y1={y} x2={x + dx} y2={y + dy} />
      <circle cx={x} cy={y} r={0.6} className="dt-bdot" />
      <circle cx={x + dx} cy={y + dy} r={r} />
      <text x={x + dx} y={y + dy + 1.1} textAnchor="middle">{id}</text>
    </g>
  );
}

/** Section marker: letter plates at both ends of the cutting line, arrows pointing the way of view. */
export function CutMark({ v, a, b, letter, dir }: { v: V; a: [number, number]; b: [number, number]; letter: string; dir: [number, number] }) {
  const pts = [a, b];
  return (
    <g className="dt-cut">
      <line x1={px(v, a[0])} y1={py(v, a[1])} x2={px(v, b[0])} y2={py(v, b[1])} />
      {pts.map((p, i) => {
        const x = px(v, p[0]);
        const y = py(v, p[1]);
        const ax = x + dir[0] * 7;
        const ay = y - dir[1] * 7;
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={ax} y2={ay} />
            <path d={`M${ax} ${ay} l${-dir[1] * 1.2 - dir[0] * 2.4} ${-dir[0] * 1.2 + dir[1] * 2.4} l${dir[1] * 2.4} ${dir[0] * 2.4} z`} />
            <text x={ax + dir[0] * 3.2} y={ay - dir[1] * 3.2 + 1} textAnchor="middle">{letter}</text>
          </g>
        );
      })}
    </g>
  );
}

export function ViewTitle({ x, y, text, scale }: { x: number; y: number; text: string; scale: string }) {
  return (
    <g>
      <text className="dt-t dt-tview" x={x} y={y} textAnchor="middle">{text}</text>
      <text className="dt-t dt-tscale" x={x} y={y + 3.6} textAnchor="middle">{scale}</text>
      <line className="dt-thin" x1={x - 18} x2={x + 18} y1={y + 5} y2={y + 5} />
    </g>
  );
}

export interface SheetInfo {
  code: string;
  titlePt: string;
  titleZh: string;
  part: string;
  scale: string;
  sheet: number;
  total: number;
  version: "v1" | "v2";
  rev: string;
  date: string;
  material?: string;
  notes: { pt: string; zh: string }[];
}

/** One A4 landscape sheet (297 x 210) with frame, general notes and title block. Views are children, in sheet millimetres. */
export function Sheet({ info, children }: { info: SheetInfo; children: ReactNode }) {
  const x0 = 142;
  const y0 = 166;
  return (
    <svg className="dt-sheet" viewBox="0 0 297 210" role="img" aria-label={`${info.code} ${info.titlePt}`}>
      <defs>
        <marker id="dt-arr" viewBox="0 0 10 6" refX="5" refY="3" markerWidth="5" markerHeight="3" orient="auto-start-reverse"><path d="M0 0 L10 3 L0 6 z" fill="#0b4fa8" /></marker>
        <pattern id="dt-hatch" width="1.5" height="1.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.5" stroke="#555" strokeWidth="0.16" /></pattern>
      </defs>
      <rect x={0} y={0} width={297} height={210} fill="#fff" />
      <rect className="dt-frame" x={5} y={5} width={287} height={200} />
      {children}
      <g className="dt-notes">
        <text className="dt-t dt-tnh" x={8} y={169.5}>Notas gerais · 通用说明</text>
        {info.notes.map((n, i) => (
          <g key={i}>
            <text className="dt-t dt-tn" x={8} y={174.5 + i * 6.2}>{i + 1}. {n.pt}</text>
            <text className="dt-t dt-tn dt-tzh" x={11} y={177.9 + i * 6.2}>{n.zh}</text>
          </g>
        ))}
      </g>
      <g className="dt-title">
        <rect x={x0} y={y0} width={150} height={39} />
        <line x1={x0} x2={x0 + 150} y1={y0 + 14} y2={y0 + 14} />
        <line x1={x0} x2={x0 + 150} y1={y0 + 22} y2={y0 + 22} />
        <line x1={x0} x2={x0 + 150} y1={y0 + 30} y2={y0 + 30} />
        <line x1={x0 + 100} x2={x0 + 100} y1={y0} y2={y0 + 14} />
        {[37.5, 75, 112.5].map((d) => <line key={d} x1={x0 + d} x2={x0 + d} y1={y0 + 14} y2={y0 + 30} />)}
        <line x1={x0 + 75} x2={x0 + 75} y1={y0 + 30} y2={y0 + 39} />
        <text className="dt-t dt-tl" x={x0 + 2} y={y0 + 3.4}>Título · 图名</text>
        <text className="dt-t dt-tb" x={x0 + 2} y={y0 + 8.2}>{info.titlePt}</text>
        <text className="dt-t dt-tbz" x={x0 + 2} y={y0 + 12.4}>{info.titleZh}</text>
        <text className="dt-t dt-tl" x={x0 + 102} y={y0 + 3.4}>Código · 图号</text>
        <text className="dt-t dt-tb" x={x0 + 102} y={y0 + 10}>{info.code}</text>
        {([
          ["Peça · 零件", info.part], ["Material · 材料", info.material ?? "PLA"], ["Escala · 比例", info.scale], ["Folha · 张", `${info.sheet} / ${info.total}`],
        ] as const).map(([l, val], i) => (
          <g key={l}>
            <text className="dt-t dt-tl" x={x0 + i * 37.5 + 2} y={y0 + 17.2}>{l}</text>
            <text className="dt-t dt-tv" x={x0 + i * 37.5 + 2} y={y0 + 21}>{val}</text>
          </g>
        ))}
        {([
          ["Unidades · 单位", "mm"], ["Tolerância · 公差", "±0,2 (ISO 2768-m)"], ["Revisão · 版本", `${info.rev} · ${info.date}`], ["Versão · 版本号", info.version === "v1" ? "v1 pilha 9 V" : "v2 fonte 12 V"],
        ] as const).map(([l, val], i) => (
          <g key={l}>
            <text className="dt-t dt-tl" x={x0 + i * 37.5 + 2} y={y0 + 25.2}>{l}</text>
            <text className="dt-t dt-tv" x={x0 + i * 37.5 + 2} y={y0 + 29}>{val}</text>
          </g>
        ))}
        <text className="dt-t dt-tl" x={x0 + 2} y={y0 + 33.2}>Projeto · 项目</text>
        <text className="dt-t dt-tv" x={x0 + 2} y={y0 + 37.2}>Pregoscópio — suporte com luz 显微镜支架</text>
        <text className="dt-t dt-tl" x={x0 + 77} y={y0 + 33.2}>Projeção · 投影法</text>
        <text className="dt-t dt-tv" x={x0 + 77} y={y0 + 37.2}>1º diedro 第一角</text>
        {/* first-angle symbol: frustum, then its two circles */}
        <g className="dt-sym" transform={`translate(${x0 + 123} ${y0 + 31.5})`}>
          <path d="M0 1.2 L5 0 L5 6 L0 4.8 Z" />
          <circle cx={9.5} cy={3} r={3} />
          <circle cx={9.5} cy={3} r={1.2} />
        </g>
      </g>
    </svg>
  );
}
