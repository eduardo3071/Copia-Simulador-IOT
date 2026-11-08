import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  bom, bomCsv, EVIDENCE_LABEL, partFile, testPlan, v1Light, v2Light, LED_VF, BATTERY_MAH, R1_OHMS, RHEOSTAT_OHMS, DIODE_DROP_V,
  type PartKind, type SuportePart, type SuporteVersion,
} from "@simiot/adapter-cad";
import { JIGS } from "./jigs.ts";
import { Painel1000x, SimulatedTest, TubeOptics } from "./TesteSimulado.tsx";
import { Custos } from "./Custos.tsx";
import { DrawingCheck } from "./Desenhos.tsx";
import { LANG_LABEL, LangContext, type DocLang } from "./lang.tsx";
import { Manual, pdfUrl, StepShot, StepViewer } from "./Manual.tsx";
import { ASSETS, HEAD_Z, INNER_TUBE_REACH, JigPreview, NOMINAL_RETRACT, OBJECTIVE_LENGTH, SLEEVE_DEPTH, SLIDE_Z, SuporteScene, type Layer } from "./Scene.tsx";

type Tab = "3d" | "manual" | "eletronica" | "calibracao";
const KIND_LABEL: Record<PartKind, string> = { impressa: "Peças impressas", referencia: "Pregoscópio (STEP V1)", comprada: "Peças compradas", calibracao: "Gabaritos" };
const KIND_ORDER: PartKind[] = ["impressa", "referencia", "comprada", "calibracao"];
const LAYER_LABEL: Record<Layer, string> = { impressa: "Impressas", pregoscopio: "Pregoscópio", eletronica: "Eletrônica", parafusos: "Parafusos", lamina: "Lâmina", fios: "Fios e cola" };

/** WebGL can be missing (old drivers, locked-down browsers): the lists and the electronics must keep working. */
class Guard extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <p className="muted guard">O 3D não pôde iniciar neste navegador (WebGL indisponível). A lista de peças, a eletrônica e os gabaritos continuam abaixo.</p> : this.props.children;
  }
}

/** #suporte, #suporte/eletronica, #suporte/calibracao/v2 ... so each view has its own link. */
function fromHash(): { tab: Tab; version: SuporteVersion; view: string; shot: boolean; check: boolean; doc: boolean; lang: DocLang } {
  const [, tab, version, view, mode, lang] = location.hash.split("/");
  return {
    tab: tab === "eletronica" || tab === "calibracao" || tab === "manual" ? tab : "3d",
    version: version === "v2" ? "v2" : "v1",
    view: view ?? "iso",
    shot: mode === "shot",
    check: mode === "check",
    doc: mode === "doc",
    lang: lang === "pt" || lang === "zh" || lang === "en" ? lang : "bi",
  };
}

export function SuportePage() {
  const start = useMemo(fromHash, []);
  const [version, setVersion] = useState<SuporteVersion>(start.version);
  const [tab, setTab] = useState<Tab>(start.tab);
  const [step, setStep] = useState(Number(start.view) || 1);
  const [docLang, setDocLang] = useState<DocLang>(start.lang);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (start.shot || start.doc || start.check) return;
    const names: Record<Tab, string> = { "3d": "3D e peças", manual: "Manual de construção", eletronica: "Eletrônica", calibracao: "Calibração" };
    document.title = `${names[tab]} (${version}) · Suporte do Pregoscópio`;
    history.replaceState(null, "", `${location.pathname}${location.search}#suporte/${tab}/${version}${tab === "manual" ? `/${step}` : ""}`);
  }, [tab, version, step, start.shot, start.doc, start.check]);
  // a link to another view of this page (#suporte/calibracao/v2) while it is already open
  useEffect(() => {
    const onHash = () => {
      const next = fromHash();
      setTab(next.tab);
      setVersion(next.version);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (start.check) return <LangContext.Provider value={start.lang}><DrawingCheck version={start.version} /></LangContext.Provider>;
  if (start.doc) return <div className="manual-page"><Manual version={start.version} lang={start.lang} /></div>;
  if (start.shot) return <StepShot version={start.version} n={Number(start.view) || 0} />;
  return (
    <div className="suporte">
      <header className="suporte-top">
        <a className="suporte-back" href="#">← Simulador</a>
        <h1>Suporte do Pregoscópio</h1>
        <div className="seg" role="radiogroup" aria-label="Versão">
          {(["v1", "v2"] as const).map((v) => (
            <button key={v} role="radio" aria-checked={version === v} className={version === v ? "active" : ""} onClick={() => { setVersion(v); setSelected(null); }}>
              {v === "v1" ? "v1 · pilha 9 V" : "v2 · fonte e dimmer"}
            </button>
          ))}
        </div>
        <nav className="tabs suporte-tabs" role="tablist">
          {([["3d", "3D e peças"], ["manual", "Manual de construção"], ["eletronica", "Eletrônica"], ["calibracao", "Calibração"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
      </header>
      {tab === "3d" && <ThreeD version={version} selected={selected} setSelected={setSelected} startView={start.view} />}
      {tab === "manual" && (
        <div className="manual-page">
          <div className="no-print manual-intro">
            <h2>Manual de construção · 制造与装配手册 · Construction manual</h2>
            <p className="small">Planta-mãe com todas as peças juntas, posição de cada uma, lista de materiais com medidas padrão e montagem passo a passo. Escolha a versão acima e o idioma abaixo; cada edição tem o seu PDF.</p>
            <div className="seg" role="radiogroup" aria-label="Idioma do manual">
              {(["bi", "pt", "zh", "en"] as const).map((l) => (
                <button key={l} role="radio" aria-checked={docLang === l} className={docLang === l ? "active" : ""} onClick={() => setDocLang(l)}>{LANG_LABEL[l]}</button>
              ))}
            </div>
            <div className="row">
              {(["bi", "pt", "zh", "en"] as const).map((l) => (
                <a key={l} className={`button${docLang === l ? " primary" : ""}`} href={pdfUrl(version, l)} download>PDF · {LANG_LABEL[l]}</a>
              ))}
              <button onClick={() => window.print()}>Imprimir esta página</button>
            </div>
            <LangContext.Provider value={docLang}>
              <StepViewer key={version} version={version} start={step} onStep={setStep} />
            </LangContext.Provider>
          </div>
          <Manual version={version} lang={docLang} />
        </div>
      )}
      {tab === "eletronica" && <Eletronica version={version} selected={selected} setSelected={setSelected} />}
      {tab === "calibracao" && <Calibracao />}
    </div>
  );
}

function PartRow({ part, version, selected, onSelect }: { part: SuportePart; version: SuporteVersion; selected: boolean; onSelect(): void }) {
  const qty = part.qty;
  return (
    <button className={`part-row ${selected ? "on" : ""}`} onClick={onSelect}>
      <span className="part-id">{part.id}</span>
      <span className="part-name">{part.name}</span>
      <span className="part-qty">{qty > 1 ? `× ${qty}` : ""}</span>
      <span className="sr-only">{version}</span>
    </button>
  );
}

function PartCard({ part, version }: { part: SuportePart; version: SuporteVersion }) {
  const file = partFile(part, version);
  return (
    <div className="part-card">
      <h4><span className="part-id">{part.id}</span> {part.name}</h4>
      <dl>
        <dt>Especificação</dt><dd>{part.spec}</dd>
        <dt>Por que esta peça</dt><dd>{part.criterion}</dd>
        <dt>Confiança</dt><dd>{EVIDENCE_LABEL[part.evidence]}</dd>
        <dt>Quantidade</dt><dd>{part.qty}</dd>
      </dl>
      {file && <a className="download" href={ASSETS + file} download>Baixar {file.split("/").pop()}</a>}
    </div>
  );
}

/** startView: "iso", "front", "side", "top" or "inside" (the cutaway of the light box), from #suporte/3d/v2/inside. */
function ThreeD({ version, selected, setSelected, startView }: { version: SuporteVersion; selected: string | null; setSelected(id: string | null): void; startView: string }) {
  const [explode, setExplode] = useState(0);
  const [retract, setRetract] = useState(Math.round(NOMINAL_RETRACT * 10) / 10);
  const [cut, setCut] = useState(startView === "inside" ? 0 : -50);
  const [lightOn, setLightOn] = useState(true);
  const [labels, setLabels] = useState(true);
  const [view, setView] = useState({ name: ["iso", "front", "side", "top", "inside"].includes(startView) ? startView : "iso", n: 0 });
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ impressa: true, pregoscopio: true, eletronica: true, parafusos: true, lamina: true, fios: true });
  const lines = useMemo(() => bom(version), [version]);
  const ids = useMemo(() => (labels ? lines.map((l) => l.part.id).filter((id) => !id.startsWith("G")) : []), [lines, labels]);
  const part = lines.find((l) => l.part.id === selected)?.part;
  const nose = HEAD_Z - SLEEVE_DEPTH + retract - OBJECTIVE_LENGTH;
  const gap = nose - SLIDE_Z;

  return (
    <div className="suporte-3d">
      <div className="suporte-main">
        <Guard><SuporteScene
          view={view}
          ids={ids}
          options={{ version, explode, retract, cut, lightOn, selected, layers, onPick: setSelected }}
        /></Guard>
        <div className="suporte-controls">
          <div className="row">
            {(["iso", "front", "side", "top", "inside"] as const).map((name) => (
              <button key={name} onClick={() => { if (name === "inside" && cut <= -50) setCut(0); setView({ name, n: view.n + 1 }); }}>
                {{ iso: "Isométrica", front: "Frente", side: "Lateral", top: "Topo", inside: "Interior" }[name]}
              </button>
            ))}
            <button aria-pressed={lightOn} className={lightOn ? "primary" : ""} onClick={() => setLightOn(!lightOn)}>{lightOn ? "Luz ligada" : "Luz desligada"}</button>
            <label className="check"><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Identificadores</label>
          </div>
          <div className="row sliders">
            <label>Explodir <b>{explode} mm</b><input type="range" min={0} max={70} value={explode} onChange={(e) => setExplode(Number(e.target.value))} /></label>
            <label>Corte <b>{cut <= -50 ? "desligado" : `y = ${cut} mm`}</b><input type="range" min={-50} max={70} value={cut} onChange={(e) => setCut(Number(e.target.value))} /></label>
            <label>Tubo interno estendido (escala) <b>{(INNER_TUBE_REACH - retract).toFixed(1)} mm</b><input type="range" min={INNER_TUBE_REACH - 40} max={INNER_TUBE_REACH} step={0.5} value={retract} onChange={(e) => setRetract(Number(e.target.value))} /></label>
          </div>
          <p className={`small ${gap < 0 ? "error" : "muted"}`}>
            {gap < 0
              ? `A objetiva bate na caixa: a lente ficaria ${Math.abs(gap).toFixed(1)} mm abaixo da lâmina. Puxe menos o tubo interno.`
              : `Lente a ${gap.toFixed(1)} mm acima da lâmina${Math.abs(gap - 0.8) < 0.3 ? " (foco nominal de projeto; a distância de trabalho real da objetiva fica entre 0,4 e 0,8 mm)" : ""}.`}
          </p>
          <div className="row">
            {(Object.keys(LAYER_LABEL) as Layer[]).map((l) => (
              <label key={l} className="check"><input type="checkbox" checked={layers[l]} onChange={(e) => setLayers({ ...layers, [l]: e.target.checked })} /> {LAYER_LABEL[l]}</label>
            ))}
          </div>
        </div>
        <div className="suporte-diff">
          <h4>STEP V1 × paquímetro</h4>
          <table>
            <thead><tr><th>Medida</th><th>STEP V1</th><th>Paquímetro</th></tr></thead>
            <tbody>
              <tr><td>Tubo externo ⌀</td><td>30 mm</td><td>33,5 mm</td></tr>
              <tr><td>Tubo interno ⌀</td><td>23,4 mm</td><td>22,5 mm</td></tr>
              <tr><td>Objetiva (comprimento)</td><td>—</td><td>38 mm (35 abaixo do tubo)</td></tr>
              <tr><td>Luva inferior ⌀</td><td>36 mm</td><td>não medido</td></tr>
              <tr><td>Comprimento total estendido</td><td>156,5 mm</td><td>155 mm</td></tr>
            </tbody>
          </table>
          <p className="small muted">O 3D e o anel da abraçadeira (M2) seguem o valor do paquímetro: os tubos são desenhados com as medidas das suas fotos. A cabeça e as garras vêm do STEP. O gabarito G1 resolve a dúvida do tubo externo.</p>
        </div>
      </div>
      <aside className="suporte-side">
        {part && <PartCard part={part} version={version} />}
        {KIND_ORDER.map((kind) => {
          const group = lines.filter((l) => l.part.kind === kind);
          if (!group.length) return null;
          return (
            <section key={kind}>
              <h4>{KIND_LABEL[kind]}</h4>
              {group.map((l) => <PartRow key={l.part.id} part={l.part} version={version} selected={selected === l.part.id} onSelect={() => setSelected(l.part.id)} />)}
            </section>
          );
        })}
      </aside>
    </div>
  );
}

const ELECTRICAL = /^(D|R|SW|BT|PS|J|U|RV|PCB|C)\d/;

function downloadCsv(version: SuporteVersion) {
  const url = URL.createObjectURL(new Blob([bomCsv(version)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `lista-de-compras-${version}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Eletronica({ version, selected, setSelected }: { version: SuporteVersion; selected: string | null; setSelected(id: string | null): void }) {
  const parts = bom(version).map((l) => l.part).filter((p) => ELECTRICAL.test(p.id));
  const part = parts.find((p) => p.id === selected);
  return (
    <div className="suporte-ele">
      <div className="suporte-ele-main">
        <figure className="schematic">
          <img src={`${ASSETS}eletronica/${version}-esquematico.svg`} alt={`Esquemático da versão ${version}`} />
          <figcaption className="small muted">
            {version === "v1"
              ? "BT1 → SW1 → U1 (IN). U1 (OUT) → R1 → ADJ → D1 → GND. C1 entre IN e GND. O LM317 mantém 1,25 V sobre R1, então a corrente do LED é fixa."
              : "J1 → D2 → SW1 → U1 (IN). U1 (OUT) → R1 → RV1 → ADJ → D1 → J1. C1 entre IN e GND. R1 e RV1 em série ajustam a corrente do LED."}
          </figcaption>
        </figure>
        <Calculator version={version} />
        <TestPlan version={version} />
        <SimulatedTest version={version} />
        <TubeOptics />
        <Painel1000x />
        <Custos version={version} />
        <section className="calc">
          <h4>No simulador</h4>
          <p className="small">
            Em <b>Projetos → Exemplos de referência</b> há o circuito {version === "v1" ? "“SUPORTE do PREGOSCÓPIO v1”" : "“SUPORTE do PREGOSCÓPIO v2”"} montado com as mesmas peças e os mesmos identificadores. Clique em <b>Executar</b>
            {version === "v1" ? " e no interruptor SW1 para ligar e desligar o LED; mude a tensão da pilha em BT1 para ver a corrente continuar em 18,4 mA até 6,35 V." : ", clique no interruptor SW1 e gire o reostato RV1: o painel Laboratório mostra a corrente do LED de 18 mA a 4,3 mA."} Esses exemplos usam a API do simulador.
          </p>
          <p className="small muted">O simulador avalia só corrente contínua, com fonte ideal e LED por limiar; não substitui a medição com multímetro.</p>
        </section>
        <section className="wiring">
          <h4>Ordem das ligações</h4>
          {version === "v1" ? (
            <ol>
              <li>Fio vermelho do clipe BT1 ao terminal 1 do interruptor SW1.</li>
              <li>Terminal 2 do SW1 ao pino IN do U1. Vendo o LM317T de frente, com o lado das letras para você, os pinos são ADJ, OUT e IN, da esquerda para a direita.</li>
              <li>C1 (100 nF) entre o pino IN do U1 e o GND, soldado perto do U1.</li>
              <li>Pino OUT do U1 a uma ponta de R1 (68 Ω).</li>
              <li>Outra ponta de R1 ao pino ADJ do U1 e à perna mais longa do D1 (ânodo): os três no mesmo ponto.</li>
              <li>Perna mais curta do D1 (cátodo) ao fio preto do clipe BT1 (GND). O outro terminal do C1 também vai ao GND.</li>
              <li>Antes de fechar a tampa, faça o plano de teste acima.</li>
            </ol>
          ) : (
            <ol>
              <li>Fonte PS1 (12 V) no conector J1. Confirme com o multímetro que o centro do plugue é positivo.</li>
              <li>Positivo do J1 ao ânodo do D2 (1N5819, o lado sem faixa). O cátodo do D2 (lado da faixa) ao terminal 1 do SW1.</li>
              <li>Terminal 2 do SW1 ao pino IN do U1. C1 (100 nF) entre IN e GND, perto do U1.</li>
              <li>Pino OUT do U1 a R1 (68 Ω); R1 ao terminal 1 do RV1; os terminais 2 e 3 do RV1 ligados entre si.</li>
              <li>Terminais 2 e 3 do RV1 ao pino ADJ do U1 e ao ânodo do D1.</li>
              <li>Cátodo do D1 ao GND do J1. O outro terminal do C1 também vai ao GND.</li>
              <li>Antes de fechar a tampa, faça o plano de teste acima.</li>
            </ol>
          )}
        </section>
      </div>
      <aside className="suporte-side">
        {part && <PartCard part={part} version={version} />}
        <section>
          <h4>Peças elétricas da {version === "v1" ? "v1" : "v2"}</h4>
          {parts.map((p) => <PartRow key={p.id} part={p} version={version} selected={selected === p.id} onSelect={() => setSelected(p.id)} />)}
        </section>
        <section>
          <h4>Lista de compras</h4>
          <p className="small muted">Todas as peças compradas da {version}, com o que procurar na loja. O preço fica em branco: nenhum foi conferido.</p>
          <button onClick={() => downloadCsv(version)}>Baixar lista (CSV)</button>
        </section>
      </aside>
    </div>
  );
}

function TestPlan({ version }: { version: SuporteVersion }) {
  const rows = testPlan(version);
  return (
    <section className="calc">
      <h4>Plano de teste com o multímetro</h4>
      <p className="small muted">
        {version === "v1" ? "Pilha nova de 9 V, LED branco de 3,1 V." : "Fonte de 12 V e LED branco de 3,1 V."} Meça nesta ordem; a primeira leitura fora da faixa mostra onde procurar o erro.
      </p>
      <table className="plan">
        <thead><tr><th>Ponto</th><th>Esperado</th><th>Faixa</th><th>Se estiver fora</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.point}>
              <td>{r.point}</td>
              <td className="mono">{r.expected}</td>
              <td className="mono">{r.low.toFixed(r.unit === "V" ? 1 : 1).replace(".", ",")} a {r.high.toFixed(1).replace(".", ",")} {r.unit}</td>
              <td className="small">{r.hint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Calculator({ version }: { version: SuporteVersion }) {
  const [vbat, setVbat] = useState(9);
  const [r1, setR1] = useState(R1_OHMS);
  const [vf, setVf] = useState(LED_VF);
  const [cap, setCap] = useState(BATTERY_MAH);
  const [vin, setVin] = useState(12);
  const [pot, setPot] = useState(0);
  const a = v1Light(vbat, r1, vf, cap);
  const b = v2Light(vin, R1_OHMS, pot, vf);
  const num = (value: number, set: (n: number) => void, props: { min?: number; max?: number; step?: number } = {}) => (
    <input type="number" value={value} onChange={(e) => set(Number(e.target.value))} {...props} />
  );
  return (
    <section className="calc">
      <h4>Calculadora do LED</h4>
      {version === "v1" ? (
        <>
          <div className="row">
            <label>Pilha (V) {num(vbat, setVbat, { min: 3, max: 12, step: 0.1 })}</label>
            <label>R1 (Ω) {num(r1, setR1, { min: 10, max: 2200 })}</label>
            <label>Vf do LED (V) {num(vf, setVf, { min: 2, max: 4, step: 0.1 })}</label>
            <label>Capacidade (mAh) {num(cap, setCap, { min: 50, max: 3000 })}</label>
          </div>
          <dl>
            <dt>Corrente do LED</dt><dd>{a.regulating ? a.currentmA.toFixed(1) : "0,0"} mA {a.currentmA > 20 ? <span className="error">acima de 20 mA</span> : null}</dd>
            <dt>Entrada mínima do U1</dt><dd>{a.minInputV.toFixed(2)} V {a.regulating ? "" : <span className="error">a pilha está abaixo: o LED escurece</span>}</dd>
            <dt>Dissipação em R1</dt><dd>{a.setResistorMilliwatts.toFixed(0)} mW de 250 mW</dd>
            <dt>Dissipação no U1</dt><dd>{a.regulatorMilliwatts.toFixed(0)} mW</dd>
            <dt>Autonomia estimada</dt><dd>{a.hours.toFixed(0)} h</dd>
          </dl>
          <p className="small muted">A corrente é 1,25 V ÷ R1 e não depende da pilha enquanto ela estiver acima da entrada mínima.</p>
        </>
      ) : (
        <>
          <div className="row">
            <label>Fonte (V) {num(vin, setVin, { min: 3, max: 20, step: 0.5 })}</label>
            <label>Reostato RV1: {pot} Ω <input type="range" min={0} max={RHEOSTAT_OHMS} value={pot} onChange={(e) => setPot(Number(e.target.value))} /></label>
          </div>
          <dl>
            <dt>Corrente do LED</dt><dd>{b.regulating ? b.currentmA.toFixed(1) : "0,0"} mA</dd>
            <dt>Resistência de ajuste (R1 + RV1)</dt><dd>{b.setOhms} Ω</dd>
            <dt>Dissipação no U1</dt><dd>{b.regulatorMilliwatts.toFixed(0)} mW</dd>
            <dt>Entrada mínima da fonte (com o D2 de {DIODE_DROP_V.toFixed(1).replace(".", ",")} V)</dt><dd>{b.minInputV.toFixed(2)} V {b.regulating ? "" : <span className="error">a fonte está abaixo</span>}</dd>
            <dt>Carga mínima do U1</dt><dd>{b.aboveMinLoad ? "atendida" : <span className="error">corrente abaixo de 3,5 mA, o LM317 pode oscilar</span>}</dd>
          </dl>
        </>
      )}
    </section>
  );
}

function Calibracao() {
  const [jig, setJig] = useState(JIGS[0]!);
  return (
    <div className="suporte-cal">
      <section className="cal-intro">
        <h4>Como usar</h4>
        <ol>
          <li>Imprima o gabarito com as mesmas configurações das peças finais (PLA, 0,2 mm), deitado e sem suportes.</li>
          <li>Prove a peça real em cada furo, do menor para o maior, e escolha o menor em que ela entra e desliza sem folga excessiva.</li>
          <li>Os pontinhos em relevo acima de cada furo indicam a posição: 1 ponto é o primeiro furo da série, 2 pontos o segundo, e assim por diante.</li>
          <li>Anote o valor e atualize o parâmetro indicado em <code>packages/adapter-cad/src/holder.ts</code>; depois rode <code>build-suporte</code>.</li>
        </ol>
      </section>
      <div className="cal-grid">
        <div className="cal-list">
          {JIGS.map((j) => (
            <button key={j.id} className={`part-row ${jig.id === j.id ? "on" : ""}`} onClick={() => setJig(j)}>
              <span className="part-id">{j.id}</span><span className="part-name">{j.title}</span>
            </button>
          ))}
        </div>
        <div className="cal-main">
          <Guard><JigPreview file={jig.file} /></Guard>
          <a className="download" href={`${ASSETS}mecanica/calibracao/${jig.file}`} download>Baixar {jig.file}</a>
          <table>
            <thead><tr><th>Série</th><th>Furos, da esquerda para a direita (mm)</th><th>Parâmetro</th></tr></thead>
            <tbody>
              {jig.series.map((s) => (
                <tr key={s.name}>
                  <td><span className="part-id">{s.id}</span> {s.name}</td>
                  <td className="mono">{s.sizes.map((v, i) => `${i + 1}: ${v}`).join(" · ")}</td>
                  <td>{s.param}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
