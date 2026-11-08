import { useMemo, useState } from "react";
import {
  bom1000x, calibration1000x, CODE_1000X, componentes1000x, derived1000x, files1000x, kindLabel, layoutEconomica1000x, masterPlan1000x, measuresToTake1000x,
  NAME_1000X, netList1000x, objectiveReport, partsUpToStep1000x, PRINT_1000X, QA_1000X, SAFETY_1000X, screwPositions1000x, STATUS_1000X, steps1000x,
  TOOLS_1000X, testPlan1000x, wireCutList1000x, wiringOrder1000x, WIRE_COLOR_NAME, type Bilingual, type Evidence1000, type ManualStep,
} from "@simiot/adapter-cad";
import { ASSETS, econRetract, SuporteScene, type Fit, type Layer } from "./Scene.tsx";
import { DOC_DATE, DOC_REV } from "./Desenhos.tsx";
import { Bi, LangContext, Tx, useLang, useTx, type DocLang } from "./lang.tsx";

const ALL_LAYERS: Record<Layer, boolean> = { impressa: true, pregoscopio: true, eletronica: true, parafusos: true, lamina: true, fios: true };
const T = (pt: string, zh: string, en: string): Bilingual => ({ pt, zh, en });
const ED = "v2-1000x";

export const stepImage1000x = (n: number) => `${ASSETS}manual/${ED}-passo-${String(n).padStart(2, "0")}.png`;
export const overviewImage1000x = () => `${ASSETS}manual/${ED}-visao-geral.png`;
export const pdfUrl1000x = (lang: DocLang = "bi") => `${ASSETS}MANUAL-${ED}${lang === "bi" ? "" : `-${lang}`}.pdf`;
const docCode = (lang: DocLang) => `MAN-PREG-${CODE_1000X}${lang === "bi" ? "" : `-${lang.toUpperCase()}`}`;

const EVIDENCE: Record<Evidence1000, Bilingual> = {
  fonte: T("de uma página", "来自网页", "from a page"),
  medido: T("medido", "实测", "measured"),
  calculado: T("calculado", "计算值", "calculated"),
  suposto: T("suposto: medir", "假设：需实测", "assumed: measure"),
};

function fitFor(step: ManualStep, only: Set<string>): Fit {
  const lid = new Set(["M3", "M5", "HS1", "D1", "PCB1", "DR1", "H3", "W1", "W2", "H1"]);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const grow = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const c = [x, y, z];
    const s = [sx, sy, sz];
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, c[i]! - s[i]! / 2); hi[i] = Math.max(hi[i]!, c[i]! + s[i]! / 2); }
  };
  const full = only.has("P1");
  for (const q of masterPlan1000x()) {
    if (!only.has(q.id) || q.id === "W1" || q.id === "W2") continue;
    if (q.id === "M1") {
      if (full) grow(q.x, q.y, q.z, q.size[0], q.size[1], q.size[2]);
      else grow(0, 12.5, 40, 90, 115, 80);
      continue;
    }
    grow(q.x, q.y, q.z - (lid.has(q.id) ? step.lidDrop : 0), q.size[0], q.size[1], q.size[2]);
  }
  if (!isFinite(lo[0]!)) grow(0, 12.5, 40, 90, 115, 80);
  const center: [number, number, number] = [(lo[0]! + hi[0]!) / 2, (lo[1]! + hi[1]!) / 2, (lo[2]! + hi[2]!) / 2];
  const radius = Math.hypot(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!) / 2;
  return { center, radius: Math.max(radius * (full ? 1.22 : 0.95), 40), dir: step.view === "lid" ? [0.55, -0.7, 0.22] : [0.55, -0.68, 0.45] };
}

function arrowsFor(step: ManualStep): { from: [number, number, number]; to: [number, number, number] }[] {
  const t = step.title.pt;
  if (t.startsWith("Fechar")) return [[-36, 52], [36, 52], [-36, -34], [36, -34]].map(([x, y]) => ({ from: [x!, y!, -step.lidDrop + 40], to: [x!, y!, -4] }));
  if (t.startsWith("Colar o difusor")) return [{ from: [0, 0, 78], to: [0, 0, 46] }];
  if (t.startsWith("Colocar a roda")) return [{ from: [92, 0, 36], to: [58, 0, 36] }];
  return [];
}

function overviewStep(): ManualStep {
  return { n: 0, title: T("Vista explodida", "爆炸图", "Exploded view"), text: T("", "", ""), adds: [...partsUpToStep1000x(99)], lidDrop: 80, view: "iso", lightOn: true };
}

function sceneFor(step: ManualStep) {
  const overview = step.n === 0;
  const only = overview ? null : partsUpToStep1000x(step.n);
  const qty: Record<string, number> = {};
  for (const l of bom1000x()) qty[l.id] = l.qty;
  const highlight = overview ? new Set<string>() : new Set([...step.adds, ...(step.also ?? [])]);
  // W2 (heat-shrink) and W3 (glue) are not drawn as parts, so they get no label
  const ids = overview ? step.adds.filter((id) => !id.startsWith("G") && id !== "W3" && id !== "W2") : [...highlight].filter((id) => only!.has(id) && id !== "W2");
  const fit: Fit = overview ? { center: [0, 12, 125], radius: 200, dir: [0.55, -0.68, 0.42] } : fitFor(step, only!);
  return { only, highlight, ids, qty, fit, arrows: overview ? [] : arrowsFor(step), explode: overview ? 38 : 0 };
}

const sceneOptions = (step: ManualStep, scene: ReturnType<typeof sceneFor>) => ({
  version: "v2" as const, econ1000: true, aperture: 0, explode: scene.explode, lidDrop: step.lidDrop, retract: econRetract(), cut: -50, lightOn: step.lightOn ?? true,
  selected: null, layers: ALL_LAYERS, only: scene.only, highlight: scene.highlight, arrows: scene.arrows, onPick: () => {},
});

/** The document of the 1000x edition. */
export function Manual1000x({ lang = "bi" }: { lang?: DocLang }) {
  return (
    <LangContext.Provider value={lang}>
      <Doc />
    </LangContext.Provider>
  );
}

function Doc() {
  const lang = useLang();
  const tx = useTx();
  const steps = useMemo(() => steps1000x(), []);
  const plan = useMemo(() => masterPlan1000x(), []);
  const screws = useMemo(() => screwPositions1000x(), []);
  const lines = useMemo(() => bom1000x(), []);
  const items = useMemo(() => componentes1000x(), []);
  const cut = useMemo(() => wireCutList1000x(), []);
  const tests = useMemo(() => testPlan1000x(), []);
  const wiring = useMemo(() => wiringOrder1000x(), []);
  const nets = useMemo(() => netList1000x(), []);
  const files = useMemo(() => files1000x(), []);
  const layout = useMemo(() => layoutEconomica1000x(), []);
  const d = useMemo(() => derived1000x(layout), [layout]);
  const o100 = useMemo(() => objectiveReport("100x", "difusor", 37), []);
  const comma = lang === "pt" || lang === "bi";
  const mm = (n: number) => (comma ? String(n).replace(".", ",") : String(n));
  const num = (n: number, dec = 1) => (comma ? n.toFixed(dec).replace(".", ",") : n.toFixed(dec));
  const nameOf = (id: string): Bilingual => lines.find((x) => x.id === id)?.name ?? T(id, id, id);
  const minutes = steps.reduce((s, x) => s + (x.minutes ?? 0), 0);
  const calib = useMemo(() => calibration1000x(), []);
  const measures = useMemo(() => measuresToTake1000x(), []);

  return (
    <article className="manual-doc">
      <section className="sheet cover">
        <p className="eyebrow">PREGOSCÓPIO · 显微镜支架与照明 · Pregoscope · {docCode(lang)} · Rev. {DOC_REV} · {DOC_DATE}</p>
        {lang === "bi" ? (
          <>
            <h2>Manual de construção · 1000x</h2>
            <h2 className="zh" lang="zh-CN">制造与装配手册 · 1000x</h2>
          </>
        ) : (
          <h2 lang={lang === "zh" ? "zh-CN" : lang}>{tx("Manual de construção · 1000x", "制造与装配手册 · 1000x", "Construction manual · 1000x")}</h2>
        )}
        <Bi as="h3" t={NAME_1000X} />
        <table className="titleblock">
          <tbody>
            <tr><th><Tx pt="Peça" zh="项目" en="Part" /></th><td><Bi t={T("Suporte com luz para pregoscópio com objetiva 100x/1,25 em óleo e ocular WF10X (1000x)", "带照明的显微镜支架，配 100x/1.25 油镜和 WF10X 目镜（1000x）", "Support with light for the pregoscope with a 100x/1.25 oil objective and a WF10X eyepiece (1000x)")} /></td></tr>
            <tr><th><Tx pt="Unidades" zh="单位" en="Units" /></th><td><Bi t={T("milímetros (mm)", "毫米 (mm)", "millimetres (mm)")} /></td></tr>
            <tr><th><Tx pt="Tolerância" zh="公差" en="Tolerance" /></th><td><Bi t={T("±0,2 mm (ISO 2768-m; PLA, camada de 0,2 mm)", "±0.2 mm（ISO 2768-m；PLA，层高 0.2 mm）", "±0.2 mm (ISO 2768-m; PLA, 0.2 mm layer)")} /></td></tr>
            <tr><th><Tx pt="Origem" zh="原点" en="Origin" /></th><td><Bi t={T("no eixo do tubo, z = 0 na face superior da tampa, +z para cima, +x à direita vista de frente, +y para a coluna", "原点在镜筒轴线上，z = 0 为底盖上表面，+z 向上，正视图 +x 向右，+y 指向立柱", "on the tube axis, z = 0 at the top face of the lid, +z up, +x to the right seen from the front, +y toward the column")} /></td></tr>
            <tr><th><Tx pt="Altura do suporte" zh="支架高度" en="Support height" /></th><td className="mono">{num(d.totalHeight)} mm</td></tr>
            <tr><th><Tx pt="Tempo estimado" zh="预计工时" en="Estimated time" /></th><td><Bi t={T(`${minutes} min de montagem, sem contar a impressão`, `装配约 ${minutes} 分钟（不含打印）`, `${minutes} min of assembly, not counting printing`)} /></td></tr>
          </tbody>
        </table>
        <div className="status-box">
          <h4><Tx pt="Status: pré-calibração, sem protótipo" zh="状态：校准前，尚无样机" en="Status: pre-calibration, no prototype" /></h4>
          <ul>{STATUS_1000X.map((s) => <li key={s.pt}><Bi t={s} /></li>)}</ul>
        </div>
        <h4><Tx pt="Revisões" zh="版本记录" en="Revisions" /></h4>
        <table className="data mini">
          <thead><tr><th>Rev.</th><th><Tx pt="Data" zh="日期" en="Date" /></th><th><Tx pt="Descrição" zh="说明" en="Description" /></th></tr></thead>
          <tbody><tr><td className="mono">{DOC_REV}</td><td className="mono">{DOC_DATE}</td><td><Bi t={T("Primeira emissão da versão 1000x econômica, pré-calibração", "1000x 经济版首次发布（校准前）", "First issue of the economical 1000x version, pre-calibration")} /></td></tr></tbody>
        </table>
      </section>

      <section className="sheet">
        <h3><Tx pt="Antes de começar" zh="开始之前" en="Before you start" /></h3>
        <h4><Tx pt="Ferramentas e materiais" zh="工具与材料" en="Tools and materials" /></h4>
        <ul className="tools">{TOOLS_1000X.map((t) => <li key={t.pt}><Bi t={t} /></li>)}</ul>
        <h4><Tx pt="Segurança" zh="安全" en="Safety" /></h4>
        <ul className="tools">{SAFETY_1000X.map((t) => <li key={t.pt}><Bi t={t} /></li>)}</ul>
        <h4><Tx pt="Impressão" zh="打印参数" en="Printing" /></h4>
        <p className="small"><Bi t={T("PLA · 0,2 mm · 3 perímetros · enchimento 20 a 30 % (roda AP1 com 100 %). Parede escura ajuda a reduzir luz espalhada.", "PLA · 层高 0.2 mm · 3 层外壁 · 填充 20~30%（转盘 AP1 为 100%）。深色外壁有助于减少杂散光。", "PLA · 0.2 mm · 3 perimeters · 20 to 30 % infill (wheel AP1 at 100 %). Dark walls help to reduce stray light.")} /></p>
        <table className="data">
          <thead><tr><th>ID</th><th><Tx pt="Peça" zh="零件" en="Part" /></th><th><Tx pt="Orientação" zh="打印方向" en="Orientation" /></th></tr></thead>
          <tbody>{PRINT_1000X.map((r) => <tr key={r.part}><td className="mono">{r.part}</td><td><Bi t={nameOf(r.part)} /></td><td><Bi t={r.text} /></td></tr>)}</tbody>
        </table>
        <h4><Tx pt="Arquivos que acompanham este manual" zh="随附文件" en="Files that come with this manual" /></h4>
        <table className="data">
          <thead><tr><th><Tx pt="Arquivo" zh="文件" en="File" /></th><th><Tx pt="Conteúdo" zh="内容" en="Content" /></th></tr></thead>
          <tbody>{files.map((fl) => <tr key={fl.file}><td className="mono small">{fl.file}</td><td><Bi t={fl.text} /></td></tr>)}</tbody>
        </table>
        <p className="small muted"><Bi t={T("Ordem do documento: vista explodida · 1 desenhos e dimensões · 2 posições · 3 lista de materiais · 4 ligações elétricas · 5 montagem · 6 teste · 7 óptica e calibração · 8 inspeção.", "文件顺序：爆炸图 · 1 图纸与尺寸 · 2 位置表 · 3 物料清单 · 4 电气连接 · 5 装配 · 6 测试 · 7 光学与校准 · 8 检验。", "Order of the document: exploded view · 1 drawings and dimensions · 2 positions · 3 bill of materials · 4 wiring · 5 assembly · 6 test · 7 optics and calibration · 8 inspection.")} /></p>
      </section>

      <section className="sheet overview">
        <h3><Tx pt="Vista explodida" zh="爆炸图" en="Exploded view" /></h3>
        <figure className="step-fig"><img src={overviewImage1000x()} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /></figure>
        <p className="small muted"><Bi t={T("Todas as peças puxadas para fora, cada uma com o seu ID; “×n” indica a quantidade.", "所有零件拆开展示，每个零件标有 ID；“×n”表示数量。", "Every part pulled apart with its ID; “×n” is the quantity.")} /></p>
      </section>

      <section className="sheet">
        <h3>1. <Tx pt="Desenhos e dimensões" zh="图纸与尺寸" en="Drawings and dimensions" /></h3>
        <p className="small"><Bi t={T("Para esta versão, os arquivos STL são a referência das peças impressas. Os desenhos técnicos DT-01 a DT-09 do manual v2 (400x) valem para a abraçadeira e para a forma geral, mas não mostram a altura de 237,6 mm, a fenda da roda na parede direita, o furo do conector em y = 32 mm nem o tubo de luz: use os STL e a tabela abaixo, que sai dos mesmos números que geram os STL.", "本版本以 STL 文件为打印件基准。v2（400x）手册的技术图 DT-01~DT-09 适用于抱箍和整体形状，但未表示 237.6 mm 高度、右壁转盘槽、y = 32 mm 的插座孔和光管：请以 STL 和下表为准，表中数值与生成 STL 的数值相同。", "For this version the STL files are the reference of the printed parts. The technical drawings DT-01 to DT-09 of the v2 (400x) manual hold for the clamp and the general shape, but do not show the 237.6 mm height, the wheel slot in the right wall, the jack hole at y = 32 mm or the light tube: use the STL files and the table below, which comes from the same numbers that generate the STL files.")} /></p>
        <table className="data">
          <thead><tr><th>ID</th><th><Tx pt="Peça" zh="零件" en="Part" /></th><th><Tx pt="Dimensões (mm)" zh="尺寸 (mm)" en="Dimensions (mm)" /></th><th><Tx pt="Origem" zh="来源" en="Source" /></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.id}</td>
                <td><Bi t={nameOf(c.id)} />{c.printed ? <span className="small muted"> ({tx("impressa", "打印件", "printed")})</span> : null}</td>
                <td className="small">{c.dims}</td>
                <td className={c.evidence === "suposto" ? "error small" : "small"}><Bi t={EVIDENCE[c.evidence]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <h4><Tx pt="Caixa e coluna desta versão" zh="本版灯箱与立柱" en="Box and column of this version" /></h4>
        <table className="data mini">
          <tbody>
            <tr><th><Tx pt="Caixa" zh="灯箱" en="Box" /></th><td className="mono">{mm(layout.box.xMax - layout.box.xMin)} × {mm(layout.box.yMax - layout.box.yMin)} × {mm(layout.box.height)}</td></tr>
            <tr><th><Tx pt="Altura total" zh="总高" en="Total height" /></th><td className="mono">{num(d.totalHeight)}</td></tr>
            <tr><th><Tx pt="Furo do conector J1" zh="插座孔 J1" en="Hole of the jack J1" /></th><td className="mono">⌀ {mm(layout.params.jackDiameter)}, y = {mm(layout.params.jackY)}, z = {mm(layout.box.height / 2)}</td></tr>
            <tr><th><Tx pt="Fenda da roda (parede direita)" zh="转盘槽（右壁）" en="Wheel slot (right wall)" /></th><td className="mono">{num(layout.lightTube!.wheel.slotWidth)} × {num(layout.lightTube!.wheel.slotHeight)}, z = {num((layout.lightTube!.wheel.bottom + layout.lightTube!.wheel.top) / 2)}</td></tr>
            <tr><th><Tx pt="Janela do LED e difusor" zh="LED 光窗与扩散片" en="LED window and diffuser" /></th><td className="mono">⌀ {mm(layout.params.ledWindowDiameter)} · ⌀ {mm(layout.params.diffuserDiameter)}</td></tr>
            <tr><th><Tx pt="Canal da lâmina" zh="载玻片槽" en="Slide channel" /></th><td className="mono">{num(layout.params.slideWidth + layout.params.slideFit)} × {mm(layout.params.channelDepth)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="sheet">
        <h3>2. <Tx pt="Posição de cada peça" zh="各零件位置" en="Position of each part" /></h3>
        <p className="small muted"><Bi t={T("Centro da peça no sistema de coordenadas da capa (mm). “Dentro” indica peça dentro da caixa fechada.", "零件中心在封面所述坐标系中的位置（mm）。“盒内”表示位于封闭盒体内部。", "Centre of the part in the coordinate system of the cover (mm). “Inside” means the part is inside the closed box.")} /></p>
        <table className="data coords">
          <thead><tr><th>ID</th><th><Tx pt="Nome" zh="名称" en="Name" /></th><th>X</th><th>Y</th><th>Z</th><th><Tx pt="Dimensão X × Y × Z" zh="尺寸 X × Y × Z" en="Size X × Y × Z" /></th><th><Tx pt="Fixação" zh="固定" en="Fixing" /></th><th><Tx pt="Dentro" zh="盒内" en="Inside" /></th></tr></thead>
          <tbody>
            {plan.map((q) => (
              <tr key={q.id}>
                <td className="mono">{q.id}</td>
                <td><Bi t={nameOf(q.id)} /></td>
                <td className="mono">{mm(q.x)}</td><td className="mono">{mm(q.y)}</td><td className="mono">{mm(q.z)}</td>
                <td className="mono">{q.size.map(mm).join(" × ")}</td>
                <td><Bi t={q.mount} /></td>
                <td><Tx pt={q.hidden ? "sim" : "não"} zh={q.hidden ? "是" : "否"} en={q.hidden ? "yes" : "no"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <h4><Tx pt="Parafusos, um a um" zh="螺钉逐个位置" en="Screws, one by one" /></h4>
        <table className="data coords">
          <thead><tr><th>ID</th><th><Tx pt="Parafuso" zh="螺钉" en="Screw" /></th><th>X</th><th>Y</th><th>Z</th></tr></thead>
          <tbody>{screws.map((s, i) => <tr key={i}><td className="mono">{s.id}</td><td><Bi t={nameOf(s.id)} /></td><td className="mono">{mm(s.x)}</td><td className="mono">{mm(s.y)}</td><td className="mono">{mm(s.z)}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="sheet">
        <h3>3. <Tx pt="Lista de materiais" zh="物料清单" en="Bill of materials" /> (BOM)</h3>
        <table className="data">
          <thead><tr><th>ID</th><th><Tx pt="Nome" zh="名称" en="Name" /></th><th><Tx pt="Qtd" zh="数量" en="Qty" /></th><th><Tx pt="Medida" zh="尺寸" en="Size" /></th><th><Tx pt="Tipo" zh="类型" en="Type" /></th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="mono">{l.id}</td>
                <td><Bi t={l.name} /></td>
                <td className="mono">{l.qty}</td>
                <td className="small">{l.spec.pt}</td>
                <td><Bi t={kindLabel(l.kind)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted"><Bi t={T("As peças P1 a P6 e P10 são o pregoscópio e o ocular WF10X é fornecido pelo cliente; a objetiva 100x (P9) é comprada. Confira cada peça marcada \"suposto\" com o paquímetro antes de imprimir em série.", "P1~P6 和 P10 为显微镜本体，WF10X 目镜由客户提供；100x 物镜（P9）需采购。批量打印前，请用卡尺核对每个标注“suposto（假设）”的零件。", "Parts P1 to P6 and P10 are the pregoscope and the WF10X eyepiece is supplied by the customer; the 100x objective (P9) is bought. Check every part marked \"suposto\" (assumed) with the caliper before printing in series.")} /></p>
        <h4><Tx pt="Medidas a tomar nas peças compradas" zh="需在所购零件上实测的尺寸" en="Measurements to take on the purchased parts" /></h4>
        <table className="data">
          <thead><tr><th>ID</th><th><Tx pt="Peça" zh="零件" en="Part" /></th><th><Tx pt="Valor usado no 3D (mm)" zh="3D 中使用的数值 (mm)" en="Value used in the 3D (mm)" /></th><th><Tx pt="Medido" zh="实测" en="Measured" /></th></tr></thead>
          <tbody>{measures.map((c) => <tr key={c.id}><td className="mono">{c.id}</td><td><Bi t={nameOf(c.id)} /></td><td className="small">{c.dims}</td><td className="blank" /></tr>)}</tbody>
        </table>
      </section>

      <section className="sheet">
        <h3>4. <Tx pt="Esquemático e ligações" zh="原理图与连接" en="Schematic and wiring" /></h3>
        <figure className="schematic-fig"><img src={`${ASSETS}eletronica/v2-1000x-esquematico.svg`} alt="" /></figure>
        <h4><Tx pt="Ordem de soldagem" zh="焊接顺序" en="Soldering order" /></h4>
        <ol className="wiring-list">{wiring.map((w) => <li key={w.pt}><Bi t={w} /></li>)}</ol>
        <h4><Tx pt="Ligações do circuito" zh="电路连接" en="Circuit connections" /></h4>
        <ol className="wiring-list">{nets.map((w) => <li key={w.pt}><Bi t={w} /></li>)}</ol>
        <h4><Tx pt="Lista de corte dos fios" zh="导线下料表" en="Wire cut list" /></h4>
        <table className="data">
          <thead><tr><th>ID</th><th><Tx pt="Cor" zh="颜色" en="Colour" /></th><th><Tx pt="De" zh="起点" en="From" /></th><th><Tx pt="Para" zh="终点" en="To" /></th><th><Tx pt="Trajeto (mm)" zh="走线长度 (mm)" en="Path (mm)" /></th><th><Tx pt="Cortar (mm)" zh="下料长度 (mm)" en="Cut to (mm)" /></th></tr></thead>
          <tbody>
            {cut.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td><span className="swatch" style={{ background: r.colorHex }} /> <Tx pt={WIRE_COLOR_NAME[r.colorHex]?.pt ?? ""} zh={WIRE_COLOR_NAME[r.colorHex]?.zh ?? ""} en={WIRE_COLOR_NAME[r.colorHex]?.en ?? ""} /></td>
                <td className="mono">{r.from}</td>
                <td className="mono">{r.to}</td>
                <td className="mono">{r.path}</td>
                <td className="mono"><b>{r.cut}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted"><Bi t={T("Corte = trajeto + 12 mm de pontas descascaradas (6 mm em cada lado) + folga (70 mm nos fios F1 a F3, que saem de peças da parede, para a tampa abrir sem desligar nada; 15 mm nos fios F4 e F5 do LED). Fio flexível 24 AWG. Os trajetos foram calculados em volta das peças e conferidos por teste.", "下料长度 = 走线长度 + 12 mm 剥线（两端各 6 mm）+ 余量（F1~F3 起点在盒壁零件上，余量 70 mm，开盖时无需断线；LED 导线 F4、F5 余量 15 mm）。导线为 24 AWG 软线。走线绕开各零件计算，并经测试验证。", "Cut = path + 12 mm of stripped ends (6 mm each side) + slack (70 mm on wires F1 to F3, which start on parts of the wall, so the lid opens without disconnecting anything; 15 mm on the LED wires F4 and F5). 24 AWG flexible wire. The paths were calculated around the parts and checked by a test.")} /></p>
        <p className="small muted"><Bi t={T("Não há placa de circuito impresso nesta versão: o driver vem pronto e a placa ilhada só serve de apoio. Se você usar dois módulos em vez de um (um step-down e um módulo de corrente constante de 2,8 a 6 V), ligue o step-down entre a chave e o módulo, ajustado para cerca de 5 V.", "本版本没有定制电路板：驱动为成品模块，万用板仅作支撑。如改用两个模块（降压模块加 2.8~6 V 恒流模块），请将降压模块接在开关和恒流模块之间，调到约 5 V。", "There is no custom circuit board in this version: the driver comes ready-made and the perforated board is only a carrier. If you use two modules instead of one (a step-down and a 2.8 to 6 V constant-current module), put the step-down between the switch and the module, set to about 5 V.")} /></p>
      </section>

      <div className="steps">
        {steps.map((s) => (
          <section className="sheet step" key={s.n}>
            <h3><span className="step-n">{s.n}</span> <Bi t={s.title} /> <span className="step-min">{s.minutes} min</span></h3>
            <figure className="step-fig">
              <img src={stepImage1000x(s.n)} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </figure>
            <Bi as="p" t={s.text} />
            {s.warn && <p className="warn-note"><b>⚠ </b><Bi t={s.warn} /></p>}
            {s.check && <p className="check-note"><b>✔ </b><Bi t={s.check} /></p>}
            {s.adds.length > 0 && (
              <table className="data mini">
                <thead><tr><th>ID</th><th><Tx pt="Peça neste passo" zh="本步零件" en="Part in this step" /></th><th><Tx pt="Qtd" zh="数量" en="Qty" /></th></tr></thead>
                <tbody>{s.adds.map((id) => <tr key={id}><td className="mono">{id}</td><td><Bi t={nameOf(id)} /></td><td className="mono">{lines.find((x) => x.id === id)?.qty ?? 1}</td></tr>)}</tbody>
              </table>
            )}
          </section>
        ))}
      </div>

      <section className="sheet">
        <h3>6. <Tx pt="Teste elétrico" zh="电气测试" en="Electrical test" /></h3>
        <p className="small"><Bi t={T("Alimentação: fonte de 12 V, LED branco frio de 3 W a 350 mA. Meça nesta ordem, com a tampa aberta.", "供电：12 V 电源，3 W 冷白 LED，350 mA。盖板打开，按顺序测量。", "Supply: the 12 V adapter, 3 W cool-white LED at 350 mA. Measure in this order, with the lid open.")} /></p>
        <table className="data">
          <thead><tr><th><Tx pt="Ponto de medição" zh="测量点" en="Measuring point" /></th><th><Tx pt="Esperado" zh="期望值" en="Expected" /></th><th><Tx pt="Faixa" zh="范围" en="Range" /></th><th><Tx pt="Se estiver fora" zh="超出范围时" en="If out of range" /></th><th><Tx pt="Medido" zh="实测" en="Measured" /></th></tr></thead>
          <tbody>
            {tests.map((r) => (
              <tr key={r.point.pt}>
                <td><Bi t={r.point} /></td>
                <td className="mono">{comma ? r.expected : r.expected.replace(/(\d),(\d)/g, "$1.$2")}</td>
                <td className="mono">{comma ? r.range : r.range.replace(/(\d),(\d)/g, "$1.$2").replace(" a ", " to ")}</td>
                <td className="small"><Bi t={r.hint} /></td>
                <td className="blank" />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted"><Bi t={T("As faixas de tensão do LED, de corrente e a temperatura limite são valores de projeto, não de norma. Se uma leitura sair da faixa, pare e corrija antes de fechar a caixa.", "LED 电压、电流范围和温度上限为设计值，非标准值。如读数超出范围，请停止并排除故障后再关盖。", "The ranges of the LED voltage and current and the temperature limit are design values, not standard ones. If a reading is out of range, stop and fix it before closing the box.")} /></p>
      </section>

      <section className="sheet">
        <h3>7. <Tx pt="Óptica, foco e calibração" zh="光学、对焦与校准" en="Optics, focus and calibration" /></h3>
        <table className="data mini">
          <tbody>
            <tr><th><Tx pt="Aumento total" zh="总放大倍数" en="Total magnification" /></th><td className="mono">1000x (100x × 10x)</td></tr>
            <tr><th><Tx pt="Abertura da objetiva" zh="物镜数值孔径" en="Objective aperture" /></th><td className="mono">NA 1,25 {tx("(óleo)", "（油浸）", "(oil)")}</td></tr>
            <tr><th><Tx pt="Resolução teórica com o difusor" zh="扩散片照明的理论分辨率" en="Theoretical resolution with the diffuser" /></th><td className="mono">{num(o100.resolutionUm, 2)} µm</td></tr>
            <tr><th><Tx pt="Campo visto" zh="视场" en="Field of view" /></th><td className="mono">{num(o100.fieldDiameterMm, 2)} mm</td></tr>
            <tr><th><Tx pt="Tubo, do ombro da objetiva à borda" zh="物镜肩部到筒口" en="Tube, objective shoulder to rim" /></th><td className="mono">{num(d.tubeLength, 0)} mm {tx("de 160 mm", "（标称 160 mm）", "of 160 mm")}</td></tr>
            <tr><th><Tx pt="Distância de trabalho" zh="工作距离" en="Working distance" /></th><td className="mono">{num(d.workingDistance, 2)} mm + 0,17 mm {tx("da lamínula", "盖玻片", "cover glass")}</td></tr>
            <tr><th><Tx pt="Luz" zh="光源" en="Light" /></th><td className="mono">{num(d.ledWatts, 1)} W {tx("elétricos", "电功率", "electrical")}, {num(d.heatWatts[0], 1)}–{num(d.heatWatts[1], 1)} W {tx("de calor", "热量", "of heat")}</td></tr>
          </tbody>
        </table>
        <ol className="wiring-list">{calib.map((c) => <li key={c.pt}><Bi t={c} /></li>)}</ol>
        <p className="small muted"><Bi t={T("Depois de medir as peças, atualize os parâmetros em holder.ts e suporte-1000x.ts, gere os arquivos de novo e emita a revisão B.", "实测零件后，更新 holder.ts 和 suporte-1000x.ts 中的参数，重新生成文件并发布 B 版。", "After measuring the parts, update the parameters in holder.ts and suporte-1000x.ts, regenerate the files and issue revision B.")} /></p>
      </section>

      <section className="sheet">
        <h3>8. <Tx pt="Inspeção final" zh="最终检验" en="Final inspection" /></h3>
        <table className="data">
          <thead><tr><th>#</th><th><Tx pt="Verificação" zh="检查项" en="Check" /></th><th><Tx pt="OK" zh="合格" en="OK" /></th><th><Tx pt="NG" zh="不合格" en="Not OK" /></th></tr></thead>
          <tbody>{QA_1000X.map((q, i) => <tr key={q.pt}><td className="mono">{i + 1}</td><td><Bi t={q} /></td><td className="chk">☐</td><td className="chk">☐</td></tr>)}</tbody>
        </table>
        <table className="data sign">
          <tbody><tr><th><Tx pt="Montador" zh="装配" en="Assembler" /></th><td className="blank" /><th><Tx pt="Data" zh="日期" en="Date" /></th><td className="blank" /><th><Tx pt="Inspetor" zh="检验" en="Inspector" /></th><td className="blank" /></tr></tbody>
        </table>
      </section>
    </article>
  );
}

/** Interactive assembly of the 1000x edition: a slider through the steps. */
export function StepViewer1000x({ start, onStep }: { start: number; onStep?(n: number): void }) {
  const lang = useLang();
  const steps = useMemo(() => steps1000x(), []);
  const [n, setN] = useState(Math.min(Math.max(start, 1), steps.length));
  const step = steps[n - 1]!;
  const scene = useMemo(() => sceneFor(step), [step]);
  const [tick, setTick] = useState(0);
  const pick = (m: number) => { const k = Math.min(Math.max(m, 1), steps.length); setN(k); setTick((t) => t + 1); onStep?.(k); };
  const view = useMemo(() => ({ name: step.view as string, n: tick, fit: scene.fit }), [step.view, tick, scene.fit]);
  const prev = lang === "zh" ? "← 上一步" : lang === "en" ? "← Previous" : "← Anterior";
  const next = lang === "zh" ? "下一步 →" : lang === "en" ? "Next →" : "Próximo →";
  return (
    <div className="step-viewer">
      <SuporteScene paper view={view} ids={scene.ids} options={sceneOptions(step, scene)} qty={scene.qty} />
      <div className="step-bar">
        <button onClick={() => pick(n - 1)} disabled={n <= 1}>{prev}</button>
        <input type="range" min={1} max={steps.length} value={n} onChange={(e) => pick(Number(e.target.value))} aria-label="Passo" />
        <button className="primary" onClick={() => pick(n + 1)} disabled={n >= steps.length}>{next}</button>
      </div>
      <div className="step-text">
        <h4><span className="step-n">{n}</span> / {steps.length} <Bi t={step.title} /></h4>
        <Bi as="p" t={step.text} />
        {step.check && <p className="small muted">✔ <Bi t={step.check} /></p>}
      </div>
    </div>
  );
}

/** One step alone, filling the window: what the pictures of the printed manual are taken from. Step 0 is the exploded overview. */
export function StepShot1000x({ n }: { n: number }) {
  const steps = useMemo(() => steps1000x(), []);
  const step = n === 0 ? overviewStep() : steps[Math.min(Math.max(n, 1), steps.length) - 1]!;
  const scene = useMemo(() => sceneFor(step), [step]);
  return (
    <div className="step-shot">
      <SuporteScene paper view={{ name: step.view, n: 0, fit: scene.fit }} ids={scene.ids} hint={false} options={sceneOptions(step, scene)} qty={scene.qty} />
    </div>
  );
}
