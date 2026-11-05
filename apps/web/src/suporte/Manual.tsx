import { Component, useMemo, useState, type ReactNode } from "react";
import {
  HINT_TEXT, manualBom, manualFiles, manualSteps, masterPlan, netList, partName, partsUpToStep, screwPositions, STANDARD_SIZE, TEST_TEXT, testPlan, wiringOrder,
  kindLabel, PRINT, QA, SAFETY, STATUS, TOOLS, versionName, wireCutList, WIRE_COLOR_NAME, type Bilingual, type ManualStep, type SuporteVersion,
} from "@simiot/adapter-cad";
import { ASSETS, NOMINAL_RETRACT, SuporteScene, type Fit, type Layer } from "./Scene.tsx";
import { DOC_DATE, DOC_REV, Desenhos } from "./Desenhos.tsx";
import { JIG_TEXT, JIGS } from "./jigs.ts";
import { Bi, LangContext, Tx, useLang, useTx, type DocLang } from "./lang.tsx";

const ALL_LAYERS: Record<Layer, boolean> = { impressa: true, pregoscopio: true, eletronica: true, parafusos: true, lamina: true, fios: true };
export { DOC_REV as REVISION, DOC_DATE as REVISION_DATE };

const T = (pt: string, zh: string, en: string): Bilingual => ({ pt, zh, en });

export const stepImage = (version: SuporteVersion, n: number) => `${ASSETS}manual/${version}-passo-${String(n).padStart(2, "0")}.png`;
export const overviewImage = (version: SuporteVersion) => `${ASSETS}manual/${version}-visao-geral.png`;
/** PDF of one edition: the original (Portuguese with Chinese) or a single language. */
export const pdfUrl = (version: SuporteVersion, lang: DocLang = "bi") => `${ASSETS}MANUAL-${version}${lang === "bi" ? "" : `-${lang}`}.pdf`;
const docCode = (v: SuporteVersion, lang: DocLang) => `MAN-PREG-${v.toUpperCase()}${lang === "bi" ? "" : `-${lang.toUpperCase()}`}`;

/** Camera that frames what is on screen at a step, so every picture is as large as it can be. */
function fitFor(version: SuporteVersion, step: ManualStep, only: Set<string>): Fit {
  const lid = new Set(["M3", "D1", "PCB1", "U1", "R1", "C1", "D2", "H3", "BT1", "W1", "W2", "H1"]);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const grow = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const c = [x, y, z];
    const s = [sx, sy, sz];
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, c[i]! - s[i]! / 2); hi[i] = Math.max(hi[i]!, c[i]! + s[i]! / 2); }
  };
  const full = only.has("P1");
  for (const q of masterPlan(version)) {
    if (!only.has(q.id) || ["W1", "W2", "W3"].includes(q.id)) continue;
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

/** Arrows that show the movement of the step: the lid going up, the switch pushed in, the diffuser put down. */
function arrowsFor(step: ManualStep): { from: [number, number, number]; to: [number, number, number] }[] {
  const t = step.title.pt;
  if (t.startsWith("Fechar")) return [[-36, 52], [36, 52], [-36, -34], [36, -34]].map(([x, y]) => ({ from: [x!, y!, -step.lidDrop + 40], to: [x!, y!, -4] }));
  if (t.startsWith("Instalar o interruptor")) return [{ from: [-25, -92, 20], to: [-25, -56, 20] }];
  if (t.startsWith("Colar o difusor")) return [{ from: [0, 0, 78], to: [0, 0, 46] }];
  return [];
}

/** Step 0 is the exploded overview: every part, pulled apart, with its ID. */
function overviewStep(version: SuporteVersion): ManualStep {
  return { n: 0, title: T("Vista explodida", "爆炸图", "Exploded view"), text: T("", "", ""), adds: [...partsUpToStep(version, 99)], lidDrop: 80, view: "iso", lightOn: true };
}

function sceneFor(version: SuporteVersion, step: ManualStep) {
  const overview = step.n === 0;
  const only = overview ? null : partsUpToStep(version, step.n);
  const qty: Record<string, number> = {};
  for (const l of manualBom(version)) qty[l.id] = l.qty;
  const highlight = overview ? new Set<string>() : new Set([...step.adds, ...(step.also ?? [])]);
  const ids = overview ? step.adds.filter((id) => !id.startsWith("G") && id !== "W3") : [...highlight].filter((id) => only!.has(id) && !id.startsWith("G"));
  const fit: Fit = overview ? { center: [0, 12, 120], radius: 190, dir: [0.55, -0.68, 0.42] } : fitFor(version, step, only!);
  return { only, highlight, ids, qty, fit, arrows: overview ? [] : arrowsFor(step), explode: overview ? 38 : 0 };
}

/** The document: cover, drawings, bill of materials, wiring, assembly steps, tests and inspection. */
export function Manual({ version, lang = "bi" }: { version: SuporteVersion; lang?: DocLang }) {
  return (
    <LangContext.Provider value={lang}>
      <Doc version={version} />
    </LangContext.Provider>
  );
}

function Doc({ version }: { version: SuporteVersion }) {
  const lang = useLang();
  const tx = useTx();
  const steps = useMemo(() => manualSteps(version), [version]);
  const plan = useMemo(() => masterPlan(version), [version]);
  const screws = useMemo(() => screwPositions(version), [version]);
  const lines = useMemo(() => manualBom(version), [version]);
  const tests = useMemo(() => testPlan(version), [version]);
  const wiring = useMemo(() => wiringOrder(version), [version]);
  const nets = useMemo(() => netList(version), [version]);
  const files = useMemo(() => manualFiles(version), [version]);
  const comma = lang === "pt" || lang === "bi";
  const mm = (n: number) => (comma ? String(n).replace(".", ",") : String(n));
  const nameOf = (id: string): Bilingual => {
    const l = lines.find((x) => x.id === id);
    const pt = l?.name ?? id;
    return { pt, zh: partName(id, pt, "zh"), en: partName(id, pt, "en") };
  };
  const minutes = steps.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const jt = (pt: string): Bilingual => ({ pt, zh: JIG_TEXT[pt]?.zh ?? pt, en: JIG_TEXT[pt]?.en ?? pt });

  return (
    <article className="manual-doc">
      <section className="sheet cover">
        <p className="eyebrow">PREGOSCÓPIO · 显微镜支架与照明 · Pregoscope · {docCode(version, lang)} · Rev. {DOC_REV} · {DOC_DATE}</p>
        {lang === "bi" ? (
          <>
            <h2>Manual de construção</h2>
            <h2 className="zh" lang="zh-CN">制造与装配手册</h2>
          </>
        ) : (
          <h2 lang={lang === "zh" ? "zh-CN" : lang}>{tx("Manual de construção", "制造与装配手册", "Construction manual")}</h2>
        )}
        <Bi as="h3" t={versionName(version)} />
        <table className="titleblock">
          <tbody>
            <tr><th><Tx pt="Peça" zh="项目" en="Part" /></th><td><Bi t={T("Suporte com luz para pregoscópio (microscópio de tubo telescópico, objetiva 40x)", "带照明的显微镜支架（伸缩镜筒显微镜，40x 物镜）", "Support with light for the pregoscope (telescopic-tube microscope, 40x objective)")} /></td></tr>
            <tr><th><Tx pt="Unidades" zh="单位" en="Units" /></th><td><Bi t={T("milímetros (mm) · projeção em primeiro diedro", "毫米 (mm) · 第一角投影", "millimetres (mm) · first-angle projection")} /></td></tr>
            <tr><th><Tx pt="Tolerância" zh="公差" en="Tolerance" /></th><td><Bi t={T("±0,2 mm (ISO 2768-m; PLA, camada de 0,2 mm)", "±0.2 mm（ISO 2768-m；PLA，层高 0.2 mm）", "±0.2 mm (ISO 2768-m; PLA, 0.2 mm layer)")} /></td></tr>
            <tr><th><Tx pt="Origem" zh="原点" en="Origin" /></th><td><Bi t={T("no eixo do tubo, z = 0 na face superior da tampa (piso da caixa), +z para cima, +x à direita vista de frente, +y para a coluna", "原点在镜筒轴线上，z = 0 为底盖上表面（灯箱底面），+z 向上，正视图 +x 向右，+y 指向立柱", "on the tube axis, z = 0 at the top face of the lid (floor of the box), +z up, +x to the right seen from the front, +y toward the column")} /></td></tr>
            <tr><th><Tx pt="Tempo estimado" zh="预计工时" en="Estimated time" /></th><td><Bi t={T(`${minutes} min de montagem, sem contar a impressão`, `装配约 ${minutes} 分钟（不含打印）`, `${minutes} min of assembly, not counting printing`)} /></td></tr>
          </tbody>
        </table>
        <div className="status-box">
          <h4><Tx pt="Status: pré-calibração" zh="状态：校准前版本" en="Status: pre-calibration" /></h4>
          <p className="small"><Bi t={T("As medidas são as do projeto e ainda não foram conferidas em peças impressas. Marcadas com (*) nos desenhos.", "尺寸为设计值，尚未用打印件核实。图中以 (*) 标注。", "The dimensions are the design values and have not been checked on printed parts yet. Marked (*) in the drawings.")} /></p>
          <ul>{STATUS.map((s) => <li key={s.pt}><Bi t={s} /></li>)}</ul>
        </div>
        <h4><Tx pt="Revisões" zh="版本记录" en="Revisions" /></h4>
        <table className="data mini">
          <thead><tr><th>Rev.</th><th><Tx pt="Data" zh="日期" en="Date" /></th><th><Tx pt="Descrição" zh="说明" en="Description" /></th></tr></thead>
          <tbody><tr><td className="mono">{DOC_REV}</td><td className="mono">{DOC_DATE}</td><td><Bi t={T("Primeira emissão, pré-calibração", "首次发布（校准前）", "First issue, pre-calibration")} /></td></tr></tbody>
        </table>
      </section>

      <section className="sheet">
        <h3><Tx pt="Antes de começar" zh="开始之前" en="Before you start" /></h3>
        <h4><Tx pt="Ferramentas e materiais" zh="工具与材料" en="Tools and materials" /></h4>
        <ul className="tools">{TOOLS.map((t) => <li key={t.pt}><Bi t={t} /></li>)}</ul>
        <h4><Tx pt="Segurança" zh="安全" en="Safety" /></h4>
        <ul className="tools">{SAFETY.map((t) => <li key={t.pt}><Bi t={t} /></li>)}</ul>
        <h4><Tx pt="Impressão" zh="打印参数" en="Printing" /></h4>
        <p className="small"><Bi t={T("PLA · 0,2 mm · 3 perímetros · enchimento 20 a 30 %. Parede escura ajuda a reduzir luz espalhada.", "PLA · 层高 0.2 mm · 3 层外壁 · 填充 20~30%。深色外壁有助于减少杂散光。", "PLA · 0.2 mm · 3 perimeters · 20 to 30 % infill. Dark walls help to reduce stray light.")} /></p>
        <table className="data">
          <thead><tr><th>ID</th><th><Tx pt="Peça" zh="零件" en="Part" /></th><th><Tx pt="Orientação" zh="打印方向" en="Orientation" /></th></tr></thead>
          <tbody>{PRINT.map((r) => <tr key={r.part}><td className="mono">{r.part}</td><td><Bi t={nameOf(r.part)} /></td><td><Bi t={r.text} /></td></tr>)}</tbody>
        </table>
        <h4><Tx pt="Arquivos que acompanham este manual" zh="随附文件" en="Files that come with this manual" /></h4>
        <table className="data">
          <thead><tr><th><Tx pt="Arquivo" zh="文件" en="File" /></th><th><Tx pt="Conteúdo" zh="内容" en="Content" /></th></tr></thead>
          <tbody>{files.map((fl) => <tr key={fl.file}><td className="mono small">{fl.file}</td><td><Bi t={fl.text} /></td></tr>)}</tbody>
        </table>
        <p className="small muted"><Bi t={T("Ordem do documento: vista explodida · 1 desenhos técnicos · 2 posições · 3 lista de materiais · 4 ligações elétricas · 5 montagem · 6 teste · 7 calibração · 8 inspeção.", "文件顺序：爆炸图 · 1 技术图纸 · 2 位置表 · 3 物料清单 · 4 电气连接 · 5 装配 · 6 测试 · 7 校准 · 8 检验。", "Order of the document: exploded view · 1 technical drawings · 2 positions · 3 bill of materials · 4 wiring · 5 assembly · 6 test · 7 calibration · 8 inspection.")} /></p>
      </section>

      <section className="sheet overview">
        <h3><Tx pt="Vista explodida" zh="爆炸图" en="Exploded view" /></h3>
        <figure className="step-fig"><img src={overviewImage(version)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /></figure>
        <p className="small muted"><Bi t={T("Todas as peças puxadas para fora, cada uma com o seu ID da lista de materiais; “×n” indica a quantidade.", "所有零件拆开展示，每个零件标有物料清单 ID；“×n”表示数量。", "Every part pulled apart with its ID from the bill of materials; “×n” is the quantity.")} /></p>
      </section>

      <Desenhos version={version} />

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
          <thead><tr><th>ID</th><th><Tx pt="Nome" zh="名称" en="Name" /></th><th><Tx pt="Qtd" zh="数量" en="Qty" /></th><th><Tx pt="Medida padrão" zh="标准尺寸" en="Standard size" /></th><th><Tx pt="Tipo" zh="类型" en="Type" /></th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="mono">{l.id}</td>
                <td><Bi t={nameOf(l.id)} /></td>
                <td className="mono">{l.qty}</td>
                <td>{STANDARD_SIZE[l.id] ? <Bi t={STANDARD_SIZE[l.id]!} /> : <span className="small">{l.spec}</span>}</td>
                <td><Bi t={kindLabel(l.kind)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted"><Bi t={T("As medidas são as de catálogo; confirme as peças reais com os gabaritos G1 a G3 antes de imprimir em série. As peças P1 a P10 são o pregoscópio e são fornecidas pelo cliente.", "以上为目录标称尺寸；批量打印前请用校准件 G1~G3 核对实物。P1~P10 为显微镜本体，由客户提供。", "The sizes are the catalogue ones; check the real parts with jigs G1 to G3 before printing in series. Parts P1 to P10 are the pregoscope itself and are supplied by the customer.")} /></p>
      </section>

      <section className="sheet">
        <h3>4. <Tx pt="Esquemático e ligações" zh="原理图与连接" en="Schematic and wiring" /></h3>
        <figure className="schematic-fig"><img src={`${ASSETS}eletronica/${version}-esquematico.svg`} alt="" /></figure>
        <h4><Tx pt="Ordem de soldagem na placa" zh="焊接顺序" en="Soldering order on the board" /></h4>
        <ol className="wiring-list">{wiring.map((w) => <li key={w.pt}><Bi t={w} /></li>)}</ol>
        <h4><Tx pt="Ligações do circuito (referência para placa perfurada)" zh="电路连接（万用板参考）" en="Circuit connections (reference for perforated board)" /></h4>
        <ol className="wiring-list">{nets.map((w) => <li key={w.pt}><Bi t={w} /></li>)}</ol>
        <h4><Tx pt="Lista de corte dos fios" zh="导线下料表" en="Wire cut list" /></h4>
        <table className="data">
          <thead><tr><th>ID</th><th><Tx pt="Cor" zh="颜色" en="Colour" /></th><th><Tx pt="Extremidade livre" zh="自由端" en="Free end" /></th><th><Tx pt="Pad na placa" zh="板上焊盘" en="Board pad" /></th><th><Tx pt="Trajeto (mm)" zh="走线长度 (mm)" en="Path (mm)" /></th><th><Tx pt="Cortar (mm)" zh="下料长度 (mm)" en="Cut to (mm)" /></th></tr></thead>
          <tbody>
            {wireCutList(version).map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td><span className="swatch" style={{ background: r.colorHex }} /> <Tx pt={WIRE_COLOR_NAME[r.colorHex]?.pt ?? ""} zh={WIRE_COLOR_NAME[r.colorHex]?.zh ?? ""} en={WIRE_COLOR_NAME[r.colorHex]?.en ?? ""} /></td>
                <td className="mono">{r.from}</td>
                <td className="mono">{r.pad.replace("ANODO", tx("ANODO", "阳极", "ANODE")).replace("CATODO", tx("CATODO", "阴极", "CATHODE"))}</td>
                <td className="mono">{r.path}</td>
                <td className="mono"><b>{r.cut}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted"><Bi t={T("Corte = trajeto + 12 mm de pontas descascaradas (6 mm em cada lado) + folga (15 mm; 70 mm nos fios da tampa, para abri-la sem desligar nada). Fio flexível 24 AWG.", "下料长度 = 走线长度 + 12 mm 剥线（两端各 6 mm）+ 余量（15 mm；盖板导线 70 mm，以便开盖时不必断线）。导线为 24 AWG 软线。", "Cut = path + 12 mm of stripped ends (6 mm each side) + slack (15 mm; 70 mm on the lid wires, so the lid opens without disconnecting anything). 24 AWG flexible wire.")} /></p>
        <p className="small"><Bi t={T("Orientação da placa: a seta \"FRENTE / FRONT\" na serigrafia aponta para a frente da caixa (lado do interruptor); solde a placa com a seta nesse sentido.", "电路板方向：丝印上的“FRENTE / FRONT”箭头指向盒子正面（开关一侧）；请按此方向安装电路板。", "Board orientation: the \"FRENTE / FRONT\" arrow on the silkscreen points to the front of the box (switch side); mount the board with the arrow that way.")} /></p>
        <h4><Tx pt="Placa de circuito (arquivos Gerber)" zh="电路板（Gerber 文件）" en="Circuit board (Gerber files)" /></h4>
        <div className="pcb-figs">
          <figure><img src={`${ASSETS}eletronica/${version}-placa-frente.png`} alt="" /><figcaption className="small"><Tx pt="Face superior (componentes)" zh="顶层（元件面）" en="Top side (components)" /></figcaption></figure>
          <figure><img src={`${ASSETS}eletronica/${version}-placa-verso.png`} alt="" /><figcaption className="small"><Tx pt="Face inferior (trilhas)" zh="底层（走线面）" en="Bottom side (traces)" /></figcaption></figure>
        </div>
        <p className="small muted"><Bi t={T("Desenhado a partir dos próprios arquivos Gerber, com um programa independente do que os gerou. A conectividade do cobre foi conferida contra o esquemático: nenhuma trilha aberta e nenhum curto.", "图像直接由 Gerber 文件绘制，所用程序独立于生成文件的软件。铜层连通性已与原理图核对：无断路，无短路。", "Drawn from the Gerber files themselves with a program independent of the one that made them. The copper connectivity was checked against the schematic: no open traces and no shorts.")} /></p>
        <p className="small muted"><Bi t={T("Fio vermelho = positivo, preto = GND. O LM317 mantém 1,25 V sobre R1, então a corrente do LED fica fixa.", "红线为正极，黑线为地。LM317 在 R1 上保持 1.25 V，因此 LED 电流恒定。", "Red wire = positive, black = GND. The LM317 holds 1.25 V across R1, so the LED current stays fixed.")} /></p>
      </section>

      <div className="steps">
        {steps.map((s) => (
          <section className="sheet step" key={s.n}>
            <h3><span className="step-n">{s.n}</span> <Bi t={s.title} /> <span className="step-min">{s.minutes} min</span></h3>
            <figure className="step-fig">
              <img src={stepImage(version, s.n)} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
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
        <p className="small"><Bi t={T(`Alimentação: ${version === "v1" ? "pilha nova de 9 V" : "fonte de 12 V"}, LED branco de 3,1 V. Meça nesta ordem.`, `供电：${version === "v1" ? "新的 9 V 电池" : "12 V 电源"}，白光 LED 3.1 V。按顺序测量。`, `Supply: ${version === "v1" ? "a new 9 V battery" : "the 12 V adapter"}, white LED of 3.1 V. Measure in this order.`)} /></p>
        <table className="data">
          <thead><tr><th><Tx pt="Ponto de medição" zh="测量点" en="Measuring point" /></th><th><Tx pt="Esperado" zh="期望值" en="Expected" /></th><th><Tx pt="Faixa" zh="范围" en="Range" /></th><th><Tx pt="Se estiver fora" zh="超出范围时" en="If out of range" /></th><th><Tx pt="Medido" zh="实测" en="Measured" /></th></tr></thead>
          <tbody>
            {tests.map((r) => (
              <tr key={r.point}>
                <td><Bi t={TEST_TEXT[r.point] ?? T(r.point, r.point, r.point)} /></td>
                <td className="mono">{comma ? r.expected : r.expected.replace(",", ".")}</td>
                <td className="mono">{mm(Number(r.low.toFixed(1)))} {tx("a", "至", "to").replace(" / ", "/")} {mm(Number(r.high.toFixed(1)))} {r.unit}</td>
                <td className="small"><Bi t={HINT_TEXT[r.hint] ?? T(r.hint, r.hint, r.hint)} /></td>
                <td className="blank" />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted"><Bi t={T("Se uma leitura sair da faixa, pare e corrija antes de fechar a caixa.", "如读数超出范围，请停止并排除故障后再关盖。", "If a reading is out of range, stop and fix it before closing the box.")} /></p>
      </section>

      <section className="sheet">
        <h3>7. <Tx pt="Calibração: gabaritos G1 a G3" zh="校准件 G1~G3" en="Calibration: jigs G1 to G3" /></h3>
        <p className="small"><Bi t={T("Imprima os gabaritos antes das peças finais, com as mesmas configurações, deitados e sem suportes. Prove a peça real em cada furo, do menor para o maior, e escolha o menor em que ela entra e desliza sem folga excessiva.", "先于正式零件打印校准件，参数相同，平放且无支撑。将实物逐孔试装，选择能顺畅放入且无明显间隙的最小孔。", "Print the jigs before the final parts, with the same settings, lying flat and without supports. Try the real part in each hole, from the smallest to the largest, and pick the smallest one where it goes in and slides without too much play.")} /></p>
        {JIGS.filter((j) => j.id !== "G3" || version === "v1").map((j) => (
          <table className="data" key={j.id}>
            <thead>
              <tr><th colSpan={3}>{j.id} — <Bi t={jt(j.title)} /> ({j.file})</th></tr>
              <tr><th><Tx pt="Série" zh="系列" en="Series" /></th><th><Tx pt="Furos (mm)" zh="孔径 (mm)" en="Holes (mm)" /></th><th><Tx pt="Parâmetro a atualizar" zh="更新参数" en="Parameter to update" /></th></tr>
            </thead>
            <tbody>{j.series.map((sr) => <tr key={sr.name}><td><span className="mono">{sr.id}</span> <Bi t={jt(sr.name)} /></td><td className="mono">{sr.sizes.map((x) => (comma ? x : x.replace(",", "."))).join(" · ")}</td><td className="small"><Bi t={jt(sr.param)} /></td></tr>)}</tbody>
          </table>
        ))}
        <h4><Tx pt="Ficha de registro da calibração" zh="校准记录表" en="Calibration record sheet" /></h4>
        <table className="data">
          <thead><tr><th><Tx pt="Gabarito / série" zh="校准件 / 系列" en="Jig / series" /></th><th><Tx pt="Peça real medida" zh="实测零件" en="Real part measured" /></th><th><Tx pt="Medida real (mm)" zh="实测尺寸 (mm)" en="Real size (mm)" /></th><th><Tx pt="Furo escolhido (mm)" zh="选定孔径 (mm)" en="Chosen hole (mm)" /></th><th><Tx pt="Data / responsável" zh="日期 / 负责人" en="Date / person" /></th></tr></thead>
          <tbody>
            {JIGS.filter((j) => j.id !== "G3" || version === "v1").flatMap((j) => j.series.map((sr) => (
              <tr key={sr.id}><td><span className="mono">{sr.id}</span> <Bi t={jt(sr.name)} /></td><td className="blank" /><td className="blank" /><td className="blank" /><td className="blank" /></tr>
            )))}
          </tbody>
        </table>
        <p className="small muted"><Bi t={T("Depois de escolher os valores, atualize os parâmetros em holder.ts, gere os arquivos de novo e emita a revisão B.", "选定数值后更新 holder.ts 中的参数，重新生成文件并发布 B 版。", "After choosing the values, update the parameters in holder.ts, regenerate the files and issue revision B.")} /></p>
      </section>

      <section className="sheet">
        <h3>8. <Tx pt="Inspeção final" zh="最终检验" en="Final inspection" /></h3>
        <table className="data">
          <thead><tr><th>#</th><th><Tx pt="Verificação" zh="检查项" en="Check" /></th><th><Tx pt="OK" zh="合格" en="OK" /></th><th><Tx pt="NG" zh="不合格" en="Not OK" /></th></tr></thead>
          <tbody>{QA.map((q, i) => <tr key={q.pt}><td className="mono">{i + 1}</td><td><Bi t={q} /></td><td className="chk">☐</td><td className="chk">☐</td></tr>)}</tbody>
        </table>
        <table className="data sign">
          <tbody><tr><th><Tx pt="Montador" zh="装配" en="Assembler" /></th><td className="blank" /><th><Tx pt="Data" zh="日期" en="Date" /></th><td className="blank" /><th><Tx pt="Inspetor" zh="检验" en="Inspector" /></th><td className="blank" /></tr></tbody>
        </table>
      </section>
    </article>
  );
}

/** WebGL can be missing; the picture of the step already exists, so it stands in for the 3D. */
class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Interactive assembly: a slider through the steps, parts glow when they are added. */
export function StepViewer({ version, start, onStep }: { version: SuporteVersion; start: number; onStep?(n: number): void }) {
  const lang = useLang();
  const steps = useMemo(() => manualSteps(version), [version]);
  const [n, setN] = useState(Math.min(Math.max(start, 1), steps.length));
  const step = steps[n - 1]!;
  const scene = useMemo(() => sceneFor(version, step), [version, step]);
  const [tick, setTick] = useState(0);
  const pick = (m: number) => { const k = Math.min(Math.max(m, 1), steps.length); setN(k); setTick((t) => t + 1); onStep?.(k); };
  const view = useMemo(() => ({ name: step.view as string, n: tick, fit: scene.fit }), [step.view, tick, scene.fit]);
  const picture = <img className="step-still" src={stepImage(version, n)} alt={step.title.pt} />;
  const prev = lang === "zh" ? "← 上一步" : lang === "en" ? "← Previous" : "← Anterior";
  const next = lang === "zh" ? "下一步 →" : lang === "en" ? "Next →" : "Próximo →";

  return (
    <div className="step-viewer">
      <Boundary key={version} fallback={picture}>
        <SuporteScene
          paper
          view={view}
          ids={scene.ids}
          options={{ version, explode: scene.explode, lidDrop: step.lidDrop, retract: Math.round(NOMINAL_RETRACT * 10) / 10, cut: -50, lightOn: step.lightOn ?? true, selected: null, layers: ALL_LAYERS, only: scene.only, highlight: scene.highlight, arrows: scene.arrows, onPick: () => {} }}
          qty={scene.qty}
        />
      </Boundary>
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
export function StepShot({ version, n }: { version: SuporteVersion; n: number }) {
  const steps = useMemo(() => manualSteps(version), [version]);
  const step = n === 0 ? overviewStep(version) : steps[Math.min(Math.max(n, 1), steps.length) - 1]!;
  const scene = useMemo(() => sceneFor(version, step), [version, step]);
  return (
    <div className="step-shot">
      <SuporteScene
        paper
        view={{ name: step.view, n: 0, fit: scene.fit }}
        ids={scene.ids}
        hint={false}
        options={{ version, explode: scene.explode, lidDrop: step.lidDrop, retract: Math.round(NOMINAL_RETRACT * 10) / 10, cut: -50, lightOn: step.lightOn ?? true, selected: null, layers: ALL_LAYERS, only: scene.only, highlight: scene.highlight, arrows: scene.arrows, onPick: () => {} }}
        qty={scene.qty}
      />
    </div>
  );
}
