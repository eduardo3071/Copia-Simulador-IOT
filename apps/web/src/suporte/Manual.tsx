import { useMemo, useState } from "react";
import {
  manualBom, manualSteps, masterPlan, partsUpToStep, screwPositions, STANDARD_SIZE, testPlan, ZH_NAMES,
  type Bilingual, type SuporteVersion,
} from "@simiot/adapter-cad";
import { ASSETS, NOMINAL_RETRACT, SuporteScene, type Layer } from "./Scene.tsx";
import { PlantaMae } from "./Planta.tsx";

const ALL_LAYERS: Record<Layer, boolean> = { impressa: true, pregoscopio: true, eletronica: true, parafusos: true, lamina: true, fios: true };
export const REVISION = "A";
export const REVISION_DATE = "2026-11-03";

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

/** The document: cover, master plan, coordinates, bill of materials, assembly steps and the electrical test. */
export function Manual({ version }: { version: SuporteVersion }) {
  const steps = useMemo(() => manualSteps(version), [version]);
  const plan = useMemo(() => masterPlan(version), [version]);
  const screws = useMemo(() => screwPositions(version), [version]);
  const lines = useMemo(() => manualBom(version), [version]);
  const tests = useMemo(() => testPlan(version), [version]);
  const mm = (n: number) => String(n).replace(".", ",");

  return (
    <article className="manual-doc">
      <section className="sheet cover">
        <p className="eyebrow">PREGOSCÓPIO · 显微镜支架与照明 · Rev. {REVISION} · {REVISION_DATE}</p>
        <h2>Manual de construção</h2>
        <h2 className="zh" lang="zh-CN">制造与装配手册</h2>
        <Bi as="h3" t={versionName(version)} />
        <table className="titleblock">
          <tbody>
            <tr><th>Peça / 项目</th><td>Suporte com luz para pregoscópio (microscópio de tubo telescópico, objetiva 40x)<br /><span lang="zh-CN">带照明的显微镜支架（伸缩镜筒显微镜，40x 物镜）</span></td></tr>
            <tr><th>Unidades / 单位</th><td>milímetros (mm) · 毫米</td></tr>
            <tr><th>Tolerância / 公差</th><td>±0,2 mm (PLA, camada de 0,2 mm) · ±0.2 mm</td></tr>
            <tr><th>Origem / 原点</th><td>no eixo do tubo, z = 0 na face superior da tampa (piso da caixa), +z para cima, +x à direita vista de frente, +y para a coluna<br /><span lang="zh-CN">原点在镜筒轴线上，z = 0 为底盖上表面（灯箱底面），+z 向上，正视图 +x 向右，+y 指向立柱</span></td></tr>
            <tr><th>Revisão / 版本</th><td>{REVISION} — {REVISION_DATE}</td></tr>
          </tbody>
        </table>
        <h4>Ferramentas e materiais / 工具与材料</h4>
        <ul className="tools">{TOOLS.map((t) => <li key={t.pt}><Bi t={t} /></li>)}</ul>
        <h4>Impressão / 打印参数</h4>
        <p className="small"><b>PLA · 0,2 mm · 3 perímetros · enchimento 20 a 30 %</b> — <span lang="zh-CN">PLA · 层高 0.2 mm · 3 层外壁 · 填充 20~30%。深色外壁有助于减少杂散光。</span></p>
        <table className="data">
          <thead><tr><th>ID</th><th>Peça / 零件</th><th>Orientação / 打印方向</th></tr></thead>
          <tbody>{PRINT.map((r) => <tr key={r.part}><td className="mono">{r.part}</td><td><Bi t={{ pt: lines.find((l) => l.id === r.part)?.name ?? "", zh: ZH_NAMES[r.part] ?? "" }} /></td><td><Bi t={r} /></td></tr>)}</tbody>
        </table>
        <p className="small muted">Texto em chinês preparado sem tradutor técnico: peça a um falante nativo para revisar os termos antes de fabricar. · <span lang="zh-CN">中文内容未经专业技术翻译，量产前请由母语人员审校。</span></p>
      </section>

      <section className="sheet">
        <h3>1. Planta-mãe — vista superior / 总装图 — 俯视图</h3>
        <PlantaMae version={version} view="top" />
        <p className="small muted">Linha cheia: contorno visível. Tracejado: dentro da caixa fechada. Os círculos numerados são os IDs da lista de materiais. Cotas em mm. · <span lang="zh-CN">实线：可见轮廓；虚线：封闭盒体内部。编号圆圈对应物料清单 ID。尺寸单位 mm。</span></p>
      </section>

      <section className="sheet">
        <h3>2. Planta-mãe — vistas frontal e lateral / 总装图 — 正视图与侧视图</h3>
        <div className="plant-pair">
          <figure><PlantaMae version={version} view="front" /><figcaption>Vista frontal · 正视图</figcaption></figure>
          <figure><PlantaMae version={version} view="side" /><figcaption>Vista lateral direita · 右视图</figcaption></figure>
        </div>
        <p className="small muted">A haste roscada da cabeça P1 (170 mm) não foi desenhada. A lente fica a {mm(0.8)} mm da lâmina. · <span lang="zh-CN">头部 P1 的螺纹杆（170 mm）未绘出。镜头距载玻片 0.8 mm。</span></p>
      </section>

      <section className="sheet">
        <h3>3. Posição de cada peça / 各零件位置</h3>
        <p className="small muted">Centro da peça no sistema de coordenadas da capa (mm). A coluna “Dentro” indica peça dentro da caixa fechada. · <span lang="zh-CN">零件中心在封面所述坐标系中的位置（mm）。“盒内”表示位于封闭盒体内部。</span></p>
        <table className="data coords">
          <thead><tr><th>ID</th><th>Nome / 名称</th><th>X</th><th>Y</th><th>Z</th><th>Dimensão X × Y × Z</th><th>Fixação / 固定</th><th>Dentro</th></tr></thead>
          <tbody>
            {plan.map((q) => (
              <tr key={q.id}>
                <td className="mono">{q.id}</td>
                <td><Bi t={{ pt: lines.find((l) => l.id === q.id)?.name ?? ZH_NAMES[q.id] ?? q.id, zh: ZH_NAMES[q.id] ?? "" }} /></td>
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
          <tbody>{screws.map((s, i) => <tr key={i}><td className="mono">{s.id}</td><td><Bi t={{ pt: lines.find((l) => l.id === s.id)?.name ?? "", zh: ZH_NAMES[s.id] ?? "" }} /></td><td className="mono">{mm(s.x)}</td><td className="mono">{mm(s.y)}</td><td className="mono">{mm(s.z)}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="sheet">
        <h3>4. Lista de materiais / 物料清单 (BOM)</h3>
        <table className="data">
          <thead><tr><th>ID</th><th>Nome / 名称</th><th>Qtd / 数量</th><th>Medida padrão / 标准尺寸</th><th>Tipo / 类型</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="mono">{l.id}</td>
                <td><Bi t={{ pt: l.name, zh: l.zh }} /></td>
                <td className="mono">{l.qty}</td>
                <td>{(STANDARD_SIZE[l.id] ?? null) ? <Bi t={STANDARD_SIZE[l.id]!} /> : <span className="small">{l.spec}</span>}</td>
                <td>{l.kind === "impressa" ? "impressa / 3D 打印" : "comprada / 外购"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">As medidas acima são as de catálogo; confirme as peças com os gabaritos G1 a G3 (aba Calibração) antes de imprimir em série. · <span lang="zh-CN">以上为目录标称尺寸；批量打印前请用校准件 G1~G3 核对实物。</span></p>
      </section>

      {steps.map((s) => (
        <section className="sheet step" key={s.n}>
          <h3><span className="step-n">{s.n}</span> <Bi t={s.title} /></h3>
          <figure className="step-fig">
            <img src={stepImage(version, s.n)} alt={`${s.title.pt}, passo ${s.n}`} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </figure>
          <Bi as="p" t={s.text} />
          {s.check && <p className="check-note"><b>✔ </b><Bi t={s.check} /></p>}
          {s.adds.length > 0 && (
            <table className="data mini">
              <thead><tr><th>ID</th><th>Peça neste passo / 本步零件</th><th>Qtd</th></tr></thead>
              <tbody>{s.adds.map((id) => { const l = lines.find((x) => x.id === id); return <tr key={id}><td className="mono">{id}</td><td><Bi t={{ pt: l?.name ?? id, zh: ZH_NAMES[id] ?? "" }} /></td><td className="mono">{l?.qty ?? 1}</td></tr>; })}</tbody>
            </table>
          )}
        </section>
      ))}

      <section className="sheet">
        <h3>Teste elétrico / 电气测试</h3>
        <p className="small">Alimentação: {version === "v1" ? "pilha nova de 9 V" : "fonte de 12 V"}, LED branco de 3,1 V. Meça nesta ordem. · <span lang="zh-CN">供电：{version === "v1" ? "新的 9 V 电池" : "12 V 电源"}，白光 LED 3.1 V。按顺序测量。</span></p>
        <table className="data">
          <thead><tr><th>Ponto de medição / 测量点</th><th>Esperado / 期望值</th><th>Faixa / 范围</th></tr></thead>
          <tbody>{tests.map((r) => <tr key={r.point}><td>{r.point}</td><td className="mono">{r.expected}</td><td className="mono">{mm(Number(r.low.toFixed(1)))} a {mm(Number(r.high.toFixed(1)))} {r.unit}</td></tr>)}</tbody>
        </table>
        <p className="small muted">Se uma leitura sair da faixa, pare e consulte a aba Eletrônica do site para a causa provável. · <span lang="zh-CN">如读数超出范围，请停止并查阅网站“电子”页中的可能原因。</span></p>
      </section>
    </article>
  );
}

/** Interactive assembly: a slider through the steps, parts glow when they are added. */
export function StepViewer({ version, start, onStep }: { version: SuporteVersion; start: number; onStep?(n: number): void }) {
  const steps = useMemo(() => manualSteps(version), [version]);
  const [n, setN] = useState(Math.min(Math.max(start, 1), steps.length));
  const step = steps[n - 1]!;
  const go = (m: number) => { const k = Math.min(Math.max(m, 1), steps.length); setN(k); onStep?.(k); };
  const only = useMemo(() => partsUpToStep(version, n), [version, n]);
  const highlight = useMemo(() => new Set([...step.adds, ...(step.also ?? [])]), [step]);
  const ids = useMemo(() => [...only].filter((id) => !id.startsWith("G")), [only]);
  const [view, setView] = useState({ name: step.view as string, n: 0 });
  const pick = (m: number) => { go(m); setView((v) => ({ name: steps[m - 1]!.view, n: v.n + 1 })); };

  return (
    <div className="step-viewer">
      <SuporteScene
        view={view}
        ids={ids}
        options={{ version, explode: 0, lidDrop: step.lidDrop, retract: Math.round(NOMINAL_RETRACT * 10) / 10, cut: -50, lightOn: step.lightOn ?? true, selected: null, layers: ALL_LAYERS, only, highlight, onPick: () => {} }}
      />
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

/** One step alone, filling the window: what the screenshots of the printed manual are taken from. */
export function StepShot({ version, n }: { version: SuporteVersion; n: number }) {
  const steps = useMemo(() => manualSteps(version), [version]);
  const step = steps[Math.min(Math.max(n, 1), steps.length) - 1]!;
  const only = useMemo(() => partsUpToStep(version, step.n), [version, step.n]);
  const highlight = useMemo(() => new Set([...step.adds, ...(step.also ?? [])]), [step]);
  return (
    <div className="step-shot">
      <SuporteScene
        view={{ name: step.view, n: 0 }}
        ids={[...only].filter((id) => !id.startsWith("G"))}
        hint={false}
        options={{ version, explode: 0, lidDrop: step.lidDrop, retract: Math.round(NOMINAL_RETRACT * 10) / 10, cut: -50, lightOn: step.lightOn ?? true, selected: null, layers: ALL_LAYERS, only, highlight, onPick: () => {} }}
      />
    </div>
  );
}
