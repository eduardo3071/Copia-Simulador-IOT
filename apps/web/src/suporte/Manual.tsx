import { Component, useMemo, useState, type ReactNode } from "react";
import {
  HINT_TEXT, manualBom, manualFiles, manualSteps, masterPlan, netList, partName, partsUpToStep, screwPositions, STANDARD_SIZE, TEST_TEXT, testPlan, wiringOrder,
  type Bilingual, type ManualStep, type SuporteVersion,
} from "@simiot/adapter-cad";
import { ASSETS, NOMINAL_RETRACT, SuporteScene, type Fit, type Layer } from "./Scene.tsx";
import { DOC_DATE, DOC_REV, Desenhos } from "./Desenhos.tsx";
import { JIG_TEXT, JIGS } from "./jigs.ts";
import { Bi, LangContext, Tx, useLang, useTx, type DocLang } from "./lang.tsx";

const ALL_LAYERS: Record<Layer, boolean> = { impressa: true, pregoscopio: true, eletronica: true, parafusos: true, lamina: true, fios: true };
export { DOC_REV as REVISION, DOC_DATE as REVISION_DATE };

const T = (pt: string, zh: string, en: string): Bilingual => ({ pt, zh, en });

const versionName = (v: SuporteVersion): Bilingual =>
  v === "v1"
    ? T("Versão 1 — alimentada por pilha de 9 V", "版本 1 — 9 V 电池供电", "Version 1 — powered by a 9 V battery")
    : T("Versão 2 — fonte 12 V com ajuste de brilho (dimmer)", "版本 2 — 12 V 电源，亮度可调（调光）", "Version 2 — 12 V supply with brightness control (dimmer)");

export const stepImage = (version: SuporteVersion, n: number) => `${ASSETS}manual/${version}-passo-${String(n).padStart(2, "0")}.png`;
export const overviewImage = (version: SuporteVersion) => `${ASSETS}manual/${version}-visao-geral.png`;
/** PDF of one edition: the original (Portuguese with Chinese) or a single language. */
export const pdfUrl = (version: SuporteVersion, lang: DocLang = "bi") => `${ASSETS}MANUAL-${version}${lang === "bi" ? "" : `-${lang}`}.pdf`;
const docCode = (v: SuporteVersion, lang: DocLang) => `MAN-PREG-${v.toUpperCase()}${lang === "bi" ? "" : `-${lang.toUpperCase()}`}`;

const TOOLS: Bilingual[] = [
  T("Impressora 3D FDM, mesa de pelo menos 300 mm, PLA", "FDM 3D 打印机，打印平台不小于 300 mm，PLA 耗材", "FDM 3D printer, bed of at least 300 mm, PLA filament"),
  T("Ferro de soldar 30 a 40 W, solda 0,8 mm, alicate descascador", "30~40 W 电烙铁，0.8 mm 焊锡，剥线钳", "30 to 40 W soldering iron, 0.8 mm solder, wire stripper"),
  T("Multímetro (tensão e corrente contínua)", "万用表（直流电压和电流）", "Multimeter (DC voltage and current)"),
  T("Pistola de cola quente, soprador ou isqueiro para o termorretrátil", "热熔胶枪，热风枪或打火机（用于热缩管）", "Hot-glue gun, heat gun or lighter for the heat-shrink"),
  T("Chave Phillips pequena; broca de 3 mm; lixa fina; paquímetro", "小号十字螺丝刀；3 mm 钻头；细砂纸；游标卡尺", "Small Phillips screwdriver; 3 mm drill bit; fine sandpaper; caliper"),
];

const PRINT: { part: string; text: Bilingual }[] = [
  { part: "M1", text: T("arquivo -impressao, deitado nas costas; suportes só dentro da caixa", "使用 -impressao 文件，背面朝下打印；仅在盒内加支撑", "file -impressao, lying on its back; supports only inside the box") },
  { part: "M2", text: T("arquivo -impressao, abre para cima; sem suportes", "使用 -impressao 文件，开口朝上；不需要支撑", "file -impressao, opening upward; no supports") },
  { part: "M3", text: T("já plana; sem suportes", "已是平板；不需要支撑", "already flat; no supports") },
  { part: "M4", text: T("plano, PLA natural ou branco, 1 a 2 camadas; sem suportes", "平放，本色或白色 PLA，1~2 层；不需要支撑", "flat, natural or white PLA, 1 to 2 layers; no supports") },
];

const STATUS: Bilingual[] = [
  T("Tubo externo: o STEP dizia 30 mm e o paquímetro 33,5 mm. O 3D e o furo da abraçadeira usam 33,5 mm; confirmar com o gabarito G1.", "外镜筒：STEP 为 30 mm，卡尺测量为 33.5 mm。3D 和抱箍孔按 33.5 mm 设计，需用校准件 G1 确认。", "Outer tube: the STEP said 30 mm and the caliper 33.5 mm. The 3D and the clamp bore use 33.5 mm; confirm with jig G1."),
  T("Objetiva: 38 mm de comprimento total (dado do fabricante) e 35 mm abaixo do tubo interno (medido); a distância de trabalho real (0,4 a 0,8 mm) depende do modelo e deve ser conferida no foco.", "物镜：总长 38 mm（厂家数据），内镜筒下方露出 35 mm（实测）；实际工作距离（0.4~0.8 mm）取决于型号，需在对焦时核实。", "Objective: 38 mm total length (manufacturer data) and 35 mm below the inner tube (measured); the real working distance (0.4 to 0.8 mm) depends on the model and must be checked while focusing."),
  T("Recortes do interruptor, conector e botão, flange do LED, lâmina e parafusos: confirmar com o gabarito G2; pilha de 9 V com o G3.", "开关、插座和旋钮开孔、LED 法兰、载玻片和螺钉：用校准件 G2 确认；9 V 电池用 G3。", "Cut-outs of the switch, jack and knob, LED flange, slide and screws: confirm with jig G2; the 9 V battery with G3."),
  T("As trilhas e a máscara das placas passaram numa verificação automática, mas não foram vistas num programa de PCB.", "电路板走线和阻焊层已通过自动检查，但尚未在 PCB 软件中人工查看。", "The traces and the solder mask of the boards passed an automatic check but have not been looked at in PCB software."),
  T("O texto em chinês e em inglês foi escrito sem tradutor técnico e precisa de revisão por um falante nativo.", "中文和英文内容未经专业技术翻译，需由母语人员审校。", "The Chinese and English text was written without a technical translator and needs review by a native speaker."),
];

const SAFETY: Bilingual[] = [
  T("Ferro de soldar a cerca de 300 °C: use o suporte, ventile o local, não toque na ponta.", "烙铁温度约 300 °C：使用烙铁架，保持通风，勿触碰烙铁头。", "Soldering iron at about 300 °C: use the stand, ventilate the room, never touch the tip."),
  T("Cola quente e termorretrátil queimam: espere esfriar antes de manusear.", "热熔胶和热缩管会烫伤：冷却后再触碰。", "Hot glue and heat-shrink burn: let them cool before handling."),
  T("Confira a polaridade antes de ligar (LED, diodo, bateria, plugue de centro positivo). Ligação invertida queima componentes.", "通电前核对极性（LED、二极管、电池、中心正极插头）。接反会烧坏元件。", "Check the polarity before powering up (LED, diode, battery, positive-centre plug). A reversed connection burns components."),
  T("Use somente a fonte de 12 V indicada (v2) e pilha alcalina nova de 9 V (v1). Não use baterias recarregáveis de lítio.", "仅使用指定的 12 V 电源（v2）和新的 9 V 碱性电池（v1）。不要使用锂充电电池。", "Use only the 12 V supply listed (v2) and a new 9 V alkaline battery (v1). Do not use rechargeable lithium batteries."),
  T("Não aperte demais os parafusos em PLA e não force o vidro da lâmina.", "PLA 上的螺钉不要拧得过紧，不要用力挤压载玻片。", "Do not overtighten screws in PLA and do not force the glass slide."),
];

const QA: Bilingual[] = [
  T("A lâmina L1 desliza no canal sem esforço e sem folga lateral visível.", "载玻片 L1 在槽道内滑动顺畅，侧向无明显间隙。", "The slide L1 moves in the channel without effort and without visible side play."),
  T("O tubo do pregoscópio entra no anel e fica preso pela M2 sem rachar o PLA.", "显微镜镜筒装入环中，由 M2 夹紧，PLA 无开裂。", "The pregoscope tube fits the ring and is held by M2 without cracking the PLA."),
  T("Com o tubo interno estendido 19 mm na escala, a lente fica a cerca de 0,8 mm da lâmina e a imagem foca.", "内镜筒按刻度伸出 19 mm 时，镜头距载玻片约 0.8 mm 且图像可对焦。", "With the inner tube pulled out 19 mm on its scale the lens is about 0.8 mm from the slide and the image focuses."),
  T("O LED acende e a luz é uniforme sobre a janela, sem ponto quente.", "LED 点亮，光窗光线均匀，无亮斑。", "The LED lights and the light is even over the window, with no hot spot."),
  T("Corrente do LED medida dentro da faixa do teste elétrico.", "LED 电流在电气测试范围内。", "LED current measured inside the range of the electrical test."),
  T("Tampa fechada com 4 parafusos, sem fio preso e sem folga maior que 0,5 mm.", "底盖用 4 颗螺钉关紧，无夹线，间隙不大于 0.5 mm。", "Lid closed with 4 screws, no trapped wire and no gap larger than 0.5 mm."),
  T("Interruptor trava a pressão; na v2 o botão gira suave e o plugue encaixa.", "开关卡扣牢固；v2 的旋钮转动顺滑，插头插入到位。", "The switch snaps in; on v2 the knob turns smoothly and the plug seats."),
  T("Nada solto ao sacudir de leve; sem rebarbas nas peças impressas.", "轻轻晃动无松动部件；打印件无毛刺。", "Nothing loose when shaken gently; no burrs on the printed parts."),
];

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

const kindLabel = (kind: string): Bilingual =>
  kind === "impressa" ? T("impressa", "3D 打印", "printed") : kind === "referencia" ? T("fornecido (pregoscópio)", "客供（显微镜）", "supplied (pregoscope)") : T("comprada", "外购", "purchased");

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
