import { Component, useMemo, useState, type ReactNode } from "react";
import {
  manualBom, manualFiles, manualSteps, masterPlan, partsUpToStep, screwPositions, STANDARD_SIZE, testPlan, wiringOrder, ZH_NAMES,
  type Bilingual, type ManualStep, type SuporteVersion,
} from "@simiot/adapter-cad";
import { ASSETS, NOMINAL_RETRACT, SuporteScene, type Fit, type Layer } from "./Scene.tsx";
import { DOC_DATE, DOC_REV, Desenhos } from "./Desenhos.tsx";
import { JIGS } from "./jigs.ts";

const ALL_LAYERS: Record<Layer, boolean> = { impressa: true, pregoscopio: true, eletronica: true, parafusos: true, lamina: true, fios: true };
export { DOC_REV as REVISION, DOC_DATE as REVISION_DATE };

/** Portuguese line with the Chinese one under it, the way the whole manual is written. */
function Bi({ t, as: Tag = "span" }: { t: Bilingual; as?: "span" | "p" | "div" | "h3" | "h4" }) {
  return (
    <Tag className="bi">
      <span className="pt">{t.pt}</span>
      <span className="zh" lang="zh-CN">{t.zh}</span>
    </Tag>
  );
}

const versionName = (v: SuporteVersion): Bilingual =>
  v === "v1" ? { pt: "Versão 1 — alimentada por pilha de 9 V", zh: "版本 1 — 9 V 电池供电" } : { pt: "Versão 2 — fonte 12 V com ajuste de brilho (dimmer)", zh: "版本 2 — 12 V 电源，亮度可调（调光）" };

export const stepImage = (version: SuporteVersion, n: number) => `${ASSETS}manual/${version}-passo-${String(n).padStart(2, "0")}.png`;
export const pdfUrl = (version: SuporteVersion) => `${ASSETS}MANUAL-${version}.pdf`;
const docCode = (v: SuporteVersion) => `MAN-PREG-${v.toUpperCase()}`;

const TOOLS: Bilingual[] = [
  { pt: "Impressora 3D FDM, mesa de pelo menos 300 mm, PLA", zh: "FDM 3D 打印机，打印平台不小于 300 mm，PLA 耗材" },
  { pt: "Ferro de soldar 30 a 40 W, solda 0,8 mm, alicate descascador", zh: "30~40 W 电烙铁，0.8 mm 焊锡，剥线钳" },
  { pt: "Multímetro (tensão e corrente contínua)", zh: "万用表（直流电压和电流）" },
  { pt: "Pistola de cola quente, soprador ou isqueiro para o termorretrátil", zh: "热熔胶枪，热风枪或打火机（用于热缩管）" },
  { pt: "Chave Phillips pequena; broca de 3 mm; lixa fina; paquímetro", zh: "小号十字螺丝刀；3 mm 钻头；细砂纸；游标卡尺" },
];

const PRINT: { part: string; pt: string; zh: string }[] = [
  { part: "M1", pt: "arquivo -impressao, deitado nas costas; suportes só dentro da caixa", zh: "使用 -impressao 文件，背面朝下打印；仅在盒内加支撑" },
  { part: "M2", pt: "arquivo -impressao, abre para cima; sem suportes", zh: "使用 -impressao 文件，开口朝上；不需要支撑" },
  { part: "M3", pt: "já plana; sem suportes", zh: "已是平板；不需要支撑" },
  { part: "M4", pt: "plano, PLA natural ou branco, 1 a 2 camadas; sem suportes", zh: "平放，本色或白色 PLA，1~2 层；不需要支撑" },
];

const STATUS: Bilingual[] = [
  { pt: "Tubo externo: o STEP diz 30 mm e o paquímetro 33,5 mm. O furo da abraçadeira usa 33,5 mm; confirmar com o gabarito G1.", zh: "外镜筒：STEP 为 30 mm，卡尺测量为 33.5 mm。抱箍孔按 33.5 mm 设计，需用校准件 G1 确认。" },
  { pt: "Comprimento que a objetiva sai do tubo (35 mm) ainda não foi conferido na peça.", zh: "物镜伸出镜筒的长度（35 mm）尚未在实物上核对。" },
  { pt: "Recortes do interruptor, conector e botão, flange do LED, lâmina e parafusos: confirmar com o gabarito G2; pilha de 9 V com o G3.", zh: "开关、插座和旋钮开孔、LED 法兰、载玻片和螺钉：用校准件 G2 确认；9 V 电池用 G3。" },
  { pt: "As trilhas e a máscara das placas passaram numa verificação automática, mas não foram vistas num programa de PCB.", zh: "电路板走线和阻焊层已通过自动检查，但尚未在 PCB 软件中人工查看。" },
  { pt: "O texto em chinês foi escrito sem tradutor técnico e precisa de revisão por um falante nativo.", zh: "中文内容未经专业技术翻译，需由母语人员审校。" },
];

const SAFETY: Bilingual[] = [
  { pt: "Ferro de soldar a cerca de 300 °C: use o suporte, ventile o local, não toque na ponta.", zh: "烙铁温度约 300 °C：使用烙铁架，保持通风，勿触碰烙铁头。" },
  { pt: "Cola quente e termorretrátil queimam: espere esfriar antes de manusear.", zh: "热熔胶和热缩管会烫伤：冷却后再触碰。" },
  { pt: "Confira a polaridade antes de ligar (LED, diodo, bateria, plugue de centro positivo). Ligação invertida queima componentes.", zh: "通电前核对极性（LED、二极管、电池、中心正极插头）。接反会烧坏元件。" },
  { pt: "Use somente a fonte de 12 V indicada (v2) e pilha alcalina nova de 9 V (v1). Não use baterias recarregáveis de lítio.", zh: "仅使用指定的 12 V 电源（v2）和新的 9 V 碱性电池（v1）。不要使用锂充电电池。" },
  { pt: "Não aperte demais os parafusos em PLA e não force o vidro da lâmina.", zh: "PLA 上的螺钉不要拧得过紧，不要用力挤压载玻片。" },
];

const QA: Bilingual[] = [
  { pt: "A lâmina L1 desliza no canal sem esforço e sem folga lateral visível.", zh: "载玻片 L1 在槽道内滑动顺畅，侧向无明显间隙。" },
  { pt: "O tubo do pregoscópio entra no anel e fica preso pela M2 sem rachar o PLA.", zh: "显微镜镜筒装入环中，由 M2 夹紧，PLA 无开裂。" },
  { pt: "Com o tubo interno recolhido 22,5 mm, a lente fica a 0,8 mm da lâmina e a imagem foca.", zh: "内镜筒收回 22.5 mm 时，镜头距载玻片 0.8 mm 且图像可对焦。" },
  { pt: "O LED acende e a luz é uniforme sobre a janela, sem ponto quente.", zh: "LED 点亮，光窗光线均匀，无亮斑。" },
  { pt: "Corrente do LED medida dentro da faixa do teste elétrico.", zh: "LED 电流在电气测试范围内。" },
  { pt: "Tampa fechada com 4 parafusos, sem fio preso e sem folga maior que 0,5 mm.", zh: "底盖用 4 颗螺钉关紧，无夹线，间隙不大于 0.5 mm。" },
  { pt: "Interruptor trava a pressão; na v2 o botão gira suave e o plugue encaixa.", zh: "开关卡扣牢固；v2 的旋钮转动顺滑，插头插入到位。" },
  { pt: "Nada solto ao sacudir de leve; sem rebarbas nas peças impressas.", zh: "轻轻晃动无松动部件；打印件无毛刺。" },
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

function sceneFor(version: SuporteVersion, step: ManualStep) {
  const only = partsUpToStep(version, step.n);
  const highlight = new Set([...step.adds, ...(step.also ?? [])]);
  const ids = [...highlight].filter((id) => only.has(id) && !id.startsWith("G"));
  return { only, highlight, ids, fit: fitFor(version, step, only) };
}

const kindLabel = (kind: string): Bilingual =>
  kind === "impressa" ? { pt: "impressa", zh: "3D 打印" } : kind === "referencia" ? { pt: "fornecido (pregoscópio)", zh: "客供（显微镜）" } : { pt: "comprada", zh: "外购" };

/** The document: cover, drawings, bill of materials, wiring, assembly steps, tests and inspection. */
export function Manual({ version }: { version: SuporteVersion }) {
  const steps = useMemo(() => manualSteps(version), [version]);
  const plan = useMemo(() => masterPlan(version), [version]);
  const screws = useMemo(() => screwPositions(version), [version]);
  const lines = useMemo(() => manualBom(version), [version]);
  const tests = useMemo(() => testPlan(version), [version]);
  const wiring = useMemo(() => wiringOrder(version), [version]);
  const files = useMemo(() => manualFiles(version), [version]);
  const mm = (n: number) => String(n).replace(".", ",");
  const nameOf = (id: string): Bilingual => ({ pt: lines.find((l) => l.id === id)?.name ?? id, zh: ZH_NAMES[id] ?? "" });
  const minutes = steps.reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  return (
    <article className="manual-doc">
      <section className="sheet cover">
        <p className="eyebrow">PREGOSCÓPIO · 显微镜支架与照明 · {docCode(version)} · Rev. {DOC_REV} · {DOC_DATE}</p>
        <h2>Manual de construção</h2>
        <h2 className="zh" lang="zh-CN">制造与装配手册</h2>
        <Bi as="h3" t={versionName(version)} />
        <table className="titleblock">
          <tbody>
            <tr><th>Peça / 项目</th><td>Suporte com luz para pregoscópio (microscópio de tubo telescópico, objetiva 40x)<br /><span lang="zh-CN">带照明的显微镜支架（伸缩镜筒显微镜，40x 物镜）</span></td></tr>
            <tr><th>Unidades / 单位</th><td>milímetros (mm) · 毫米 · projeção em primeiro diedro / 第一角投影</td></tr>
            <tr><th>Tolerância / 公差</th><td>±0,2 mm (ISO 2768-m; PLA, camada de 0,2 mm) · ±0.2 mm</td></tr>
            <tr><th>Origem / 原点</th><td>no eixo do tubo, z = 0 na face superior da tampa (piso da caixa), +z para cima, +x à direita vista de frente, +y para a coluna<br /><span lang="zh-CN">原点在镜筒轴线上，z = 0 为底盖上表面（灯箱底面），+z 向上，正视图 +x 向右，+y 指向立柱</span></td></tr>
            <tr><th>Tempo estimado / 预计工时</th><td>{minutes} min de montagem, sem contar a impressão · <span lang="zh-CN">装配约 {minutes} 分钟（不含打印）</span></td></tr>
          </tbody>
        </table>
        <div className="status-box">
          <h4>Status: pré-calibração · 状态：校准前版本</h4>
          <p className="small">As medidas são as do projeto e ainda não foram conferidas em peças impressas. Marcadas com (*) nos desenhos. · <span lang="zh-CN">尺寸为设计值，尚未用打印件核实。图中以 (*) 标注。</span></p>
          <ul>{STATUS.map((s) => <li key={s.pt}><Bi t={s} /></li>)}</ul>
        </div>
        <h4>Revisões / 版本记录</h4>
        <table className="data mini">
          <thead><tr><th>Rev.</th><th>Data / 日期</th><th>Descrição / 说明</th></tr></thead>
          <tbody><tr><td className="mono">{DOC_REV}</td><td className="mono">{DOC_DATE}</td><td>Primeira emissão, pré-calibração · 首次发布（校准前）</td></tr></tbody>
        </table>
      </section>

      <section className="sheet">
        <h3>Antes de começar / 开始之前</h3>
        <h4>Ferramentas e materiais / 工具与材料</h4>
        <ul className="tools">{TOOLS.map((t) => <li key={t.pt}><Bi t={t} /></li>)}</ul>
        <h4>Segurança / 安全</h4>
        <ul className="tools">{SAFETY.map((t) => <li key={t.pt}><Bi t={t} /></li>)}</ul>
        <h4>Impressão / 打印参数</h4>
        <p className="small"><b>PLA · 0,2 mm · 3 perímetros · enchimento 20 a 30 %</b> — <span lang="zh-CN">PLA · 层高 0.2 mm · 3 层外壁 · 填充 20~30%。深色外壁有助于减少杂散光。</span></p>
        <table className="data">
          <thead><tr><th>ID</th><th>Peça / 零件</th><th>Orientação / 打印方向</th></tr></thead>
          <tbody>{PRINT.map((r) => <tr key={r.part}><td className="mono">{r.part}</td><td><Bi t={nameOf(r.part)} /></td><td><Bi t={r} /></td></tr>)}</tbody>
        </table>
        <h4>Arquivos que acompanham este manual / 随附文件</h4>
        <table className="data">
          <thead><tr><th>Arquivo / 文件</th><th>Conteúdo / 内容</th></tr></thead>
          <tbody>{files.map((fl) => <tr key={fl.file}><td className="mono small">{fl.file}</td><td><Bi t={fl} /></td></tr>)}</tbody>
        </table>
        <p className="small muted">Ordem do documento: 1 desenhos técnicos · 2 posições · 3 lista de materiais · 4 ligações elétricas · 5 montagem · 6 teste · 7 calibração · 8 inspeção. · <span lang="zh-CN">文件顺序：1 技术图纸 · 2 位置表 · 3 物料清单 · 4 电气连接 · 5 装配 · 6 测试 · 7 校准 · 8 检验。</span></p>
      </section>

      <Desenhos version={version} />

      <section className="sheet">
        <h3>2. Posição de cada peça / 各零件位置</h3>
        <p className="small muted">Centro da peça no sistema de coordenadas da capa (mm). “Dentro” indica peça dentro da caixa fechada. · <span lang="zh-CN">零件中心在封面所述坐标系中的位置（mm）。“盒内”表示位于封闭盒体内部。</span></p>
        <table className="data coords">
          <thead><tr><th>ID</th><th>Nome / 名称</th><th>X</th><th>Y</th><th>Z</th><th>Dimensão X × Y × Z</th><th>Fixação / 固定</th><th>Dentro</th></tr></thead>
          <tbody>
            {plan.map((q) => (
              <tr key={q.id}>
                <td className="mono">{q.id}</td>
                <td><Bi t={nameOf(q.id)} /></td>
                <td className="mono">{mm(q.x)}</td><td className="mono">{mm(q.y)}</td><td className="mono">{mm(q.z)}</td>
                <td className="mono">{q.size.map(mm).join(" × ")}</td>
                <td><Bi t={q.mount} /></td>
                <td>{q.hidden ? "sim / 是" : "não / 否"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h4>Parafusos, um a um / 螺钉逐个位置</h4>
        <table className="data coords">
          <thead><tr><th>ID</th><th>Parafuso / 螺钉</th><th>X</th><th>Y</th><th>Z</th></tr></thead>
          <tbody>{screws.map((s, i) => <tr key={i}><td className="mono">{s.id}</td><td><Bi t={nameOf(s.id)} /></td><td className="mono">{mm(s.x)}</td><td className="mono">{mm(s.y)}</td><td className="mono">{mm(s.z)}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="sheet">
        <h3>3. Lista de materiais / 物料清单 (BOM)</h3>
        <table className="data">
          <thead><tr><th>ID</th><th>Nome / 名称</th><th>Qtd / 数量</th><th>Medida padrão / 标准尺寸</th><th>Tipo / 类型</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="mono">{l.id}</td>
                <td><Bi t={{ pt: l.name, zh: l.zh }} /></td>
                <td className="mono">{l.qty}</td>
                <td>{STANDARD_SIZE[l.id] ? <Bi t={STANDARD_SIZE[l.id]!} /> : <span className="small">{l.spec}</span>}</td>
                <td><Bi t={kindLabel(l.kind)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">As medidas são as de catálogo; confirme as peças reais com os gabaritos G1 a G3 antes de imprimir em série. As peças P1 a P10 são o pregoscópio e são fornecidas pelo cliente. · <span lang="zh-CN">以上为目录标称尺寸；批量打印前请用校准件 G1~G3 核对实物。P1~P10 为显微镜本体，由客户提供。</span></p>
      </section>

      <section className="sheet">
        <h3>4. Esquemático e ligações / 原理图与连接</h3>
        <figure className="schematic-fig"><img src={`${ASSETS}eletronica/${version}-esquematico.svg`} alt={`Esquemático da ${version}`} /></figure>
        <h4>Ordem das ligações / 连接顺序</h4>
        <ol className="wiring-list">{wiring.map((w) => <li key={w.pt}><Bi t={w} /></li>)}</ol>
        <p className="small muted">Fio vermelho = positivo, preto = GND. O LM317 mantém 1,25 V sobre R1, então a corrente do LED fica fixa. · <span lang="zh-CN">红线为正极，黑线为地。LM317 在 R1 上保持 1.25 V，因此 LED 电流恒定。</span></p>
      </section>

      <div className="steps">
        {steps.map((s) => (
          <section className="sheet step" key={s.n}>
            <h3><span className="step-n">{s.n}</span> <Bi t={s.title} /> <span className="step-min">{s.minutes} min</span></h3>
            <figure className="step-fig">
              <img src={stepImage(version, s.n)} alt={`${s.title.pt}, passo ${s.n}`} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </figure>
            <div className="step-body">
              <Bi as="p" t={s.text} />
              {s.warn && <p className="warn-note"><b>⚠ </b><Bi t={s.warn} /></p>}
              {s.check && <p className="check-note"><b>✔ </b><Bi t={s.check} /></p>}
              {s.adds.length > 0 && (
                <table className="data mini">
                  <thead><tr><th>ID</th><th>Peça neste passo / 本步零件</th><th>Qtd</th></tr></thead>
                  <tbody>{s.adds.map((id) => <tr key={id}><td className="mono">{id}</td><td><Bi t={nameOf(id)} /></td><td className="mono">{lines.find((x) => x.id === id)?.qty ?? 1}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="sheet">
        <h3>6. Teste elétrico / 电气测试</h3>
        <p className="small">Alimentação: {version === "v1" ? "pilha nova de 9 V" : "fonte de 12 V"}, LED branco de 3,1 V. Meça nesta ordem. · <span lang="zh-CN">供电：{version === "v1" ? "新的 9 V 电池" : "12 V 电源"}，白光 LED 3.1 V。按顺序测量。</span></p>
        <table className="data">
          <thead><tr><th>Ponto de medição / 测量点</th><th>Esperado / 期望值</th><th>Faixa / 范围</th><th>Medido / 实测</th></tr></thead>
          <tbody>{tests.map((r) => <tr key={r.point}><td>{r.point}</td><td className="mono">{r.expected}</td><td className="mono">{mm(Number(r.low.toFixed(1)))} a {mm(Number(r.high.toFixed(1)))} {r.unit}</td><td className="blank" /></tr>)}</tbody>
        </table>
        <p className="small muted">Se uma leitura sair da faixa, pare e consulte a aba Eletrônica do site para a causa provável. · <span lang="zh-CN">如读数超出范围，请停止并查阅网站“电子”页中的可能原因。</span></p>
      </section>

      <section className="sheet">
        <h3>7. Calibração: gabaritos G1 a G3 / 校准件 G1~G3</h3>
        <p className="small">Imprima os gabaritos antes das peças finais, com as mesmas configurações, deitados e sem suportes. Prove a peça real em cada furo, do menor para o maior, e escolha o menor em que ela entra e desliza sem folga excessiva. · <span lang="zh-CN">先于正式零件打印校准件，参数相同，平放且无支撑。将实物逐孔试装，选择能顺畅放入且无明显间隙的最小孔。</span></p>
        {JIGS.filter((j) => j.id !== "G3" || version === "v1").map((j) => (
          <table className="data" key={j.id}>
            <thead><tr><th colSpan={3}>{j.id} — {j.title} ({j.file})</th></tr><tr><th>Série / 系列</th><th>Furos (mm) / 孔径</th><th>Parâmetro a atualizar / 更新参数</th></tr></thead>
            <tbody>{j.series.map((sr) => <tr key={sr.name}><td><span className="mono">{sr.id}</span> {sr.name}</td><td className="mono">{sr.sizes.join(" · ")}</td><td className="small">{sr.param}</td></tr>)}</tbody>
          </table>
        ))}
        <p className="small muted">Depois de escolher os valores, atualize os parâmetros em <code>packages/adapter-cad/src/holder.ts</code>, gere os arquivos de novo e emita a revisão B. · <span lang="zh-CN">选定数值后更新上述参数，重新生成文件并发布 B 版。</span></p>
      </section>

      <section className="sheet">
        <h3>8. Inspeção final / 最终检验</h3>
        <table className="data">
          <thead><tr><th>#</th><th>Verificação / 检查项</th><th>OK / 合格</th><th>NG / 不合格</th></tr></thead>
          <tbody>{QA.map((q, i) => <tr key={q.pt}><td className="mono">{i + 1}</td><td><Bi t={q} /></td><td className="chk">☐</td><td className="chk">☐</td></tr>)}</tbody>
        </table>
        <table className="data sign">
          <tbody><tr><th>Montador / 装配</th><td className="blank" /><th>Data / 日期</th><td className="blank" /><th>Inspetor / 检验</th><td className="blank" /></tr></tbody>
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
export function StepViewer({ version, start }: { version: SuporteVersion; start: number; onStep?(n: number): void }) {
  const steps = useMemo(() => manualSteps(version), [version]);
  const [n, setN] = useState(Math.min(Math.max(start, 1), steps.length));
  const step = steps[n - 1]!;
  const scene = useMemo(() => sceneFor(version, step), [version, step]);
  const [tick, setTick] = useState(0);
  const pick = (m: number) => { setN(Math.min(Math.max(m, 1), steps.length)); setTick((t) => t + 1); };
  const view = useMemo(() => ({ name: step.view as string, n: tick, fit: scene.fit }), [step.view, tick, scene.fit]);
  const picture = <img className="step-still" src={stepImage(version, n)} alt={step.title.pt} />;

  return (
    <div className="step-viewer">
      <Boundary key={version} fallback={picture}>
        <SuporteScene
          paper
          view={view}
          ids={scene.ids}
          options={{ version, explode: 0, lidDrop: step.lidDrop, retract: Math.round(NOMINAL_RETRACT * 10) / 10, cut: -50, lightOn: step.lightOn ?? true, selected: null, layers: ALL_LAYERS, only: scene.only, highlight: scene.highlight, onPick: () => {} }}
        />
      </Boundary>
      <div className="step-bar">
        <button onClick={() => pick(n - 1)} disabled={n <= 1}>← Anterior</button>
        <input type="range" min={1} max={steps.length} value={n} onChange={(e) => pick(Number(e.target.value))} aria-label="Passo" />
        <button className="primary" onClick={() => pick(n + 1)} disabled={n >= steps.length}>Próximo →</button>
      </div>
      <div className="step-text">
        <h4><span className="step-n">{n}</span> / {steps.length} <Bi t={step.title} /></h4>
        <Bi as="p" t={step.text} />
        {step.check && <p className="small muted">✔ <Bi t={step.check} /></p>}
      </div>
    </div>
  );
}

/** One step alone, filling the window: what the pictures of the printed manual are taken from. */
export function StepShot({ version, n }: { version: SuporteVersion; n: number }) {
  const steps = useMemo(() => manualSteps(version), [version]);
  const step = steps[Math.min(Math.max(n, 1), steps.length) - 1]!;
  const scene = useMemo(() => sceneFor(version, step), [version, step]);
  return (
    <div className="step-shot">
      <SuporteScene
        paper
        view={{ name: step.view, n: 0, fit: scene.fit }}
        ids={scene.ids}
        hint={false}
        options={{ version, explode: 0, lidDrop: step.lidDrop, retract: Math.round(NOMINAL_RETRACT * 10) / 10, cut: -50, lightOn: step.lightOn ?? true, selected: null, layers: ALL_LAYERS, only: scene.only, highlight: scene.highlight, onPick: () => {} }}
      />
    </div>
  );
}
