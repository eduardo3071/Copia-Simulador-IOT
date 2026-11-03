import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  bom, EVIDENCE_LABEL, partFile, v1Light, v2Light, LED_VF, BATTERY_MAH,
  type PartKind, type SuportePart, type SuporteVersion,
} from "@simiot/adapter-cad";
import { ASSETS, HEAD_Z, JigPreview, NOMINAL_RETRACT, OBJECTIVE_LENGTH, SLEEVE_DEPTH, SLIDE_Z, SuporteScene, type Layer } from "./Scene.tsx";

type Tab = "3d" | "eletronica" | "calibracao";
const KIND_LABEL: Record<PartKind, string> = { impressa: "Peças impressas", referencia: "Pregoscópio (STEP V1)", comprada: "Peças compradas", calibracao: "Gabaritos" };
const KIND_ORDER: PartKind[] = ["impressa", "referencia", "comprada", "calibracao"];
const LAYER_LABEL: Record<Layer, string> = { impressa: "Impressas", pregoscopio: "Pregoscópio", eletronica: "Eletrônica", parafusos: "Parafusos", lamina: "Lâmina" };

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
function fromHash(): { tab: Tab; version: SuporteVersion } {
  const [, tab, version] = location.hash.split("/");
  return { tab: tab === "eletronica" || tab === "calibracao" ? tab : "3d", version: version === "v2" ? "v2" : "v1" };
}

export function SuportePage() {
  const start = useMemo(fromHash, []);
  const [version, setVersion] = useState<SuporteVersion>(start.version);
  const [tab, setTab] = useState<Tab>(start.tab);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    history.replaceState(null, "", `${location.pathname}${location.search}#suporte/${tab}/${version}`);
  }, [tab, version]);
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
          {([["3d", "3D e peças"], ["eletronica", "Eletrônica"], ["calibracao", "Calibração"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
      </header>
      {tab === "3d" && <ThreeD version={version} selected={selected} setSelected={setSelected} />}
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

function ThreeD({ version, selected, setSelected }: { version: SuporteVersion; selected: string | null; setSelected(id: string | null): void }) {
  const [explode, setExplode] = useState(0);
  const [retract, setRetract] = useState(Math.round(NOMINAL_RETRACT * 10) / 10);
  const [cut, setCut] = useState(-50);
  const [lightOn, setLightOn] = useState(true);
  const [labels, setLabels] = useState(true);
  const [view, setView] = useState({ name: "iso", n: 0 });
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ impressa: true, pregoscopio: true, eletronica: true, parafusos: true, lamina: true });
  const lines = useMemo(() => bom(version), [version]);
  const ids = useMemo(() => (labels ? lines.map((l) => l.part.id).filter((id) => !id.startsWith("C")) : []), [lines, labels]);
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
            <label>Tubo interno recolhido <b>{retract.toFixed(1)} mm</b><input type="range" min={0} max={40} step={0.5} value={retract} onChange={(e) => setRetract(Number(e.target.value))} /></label>
          </div>
          <p className={`small ${gap < 0 ? "error" : "muted"}`}>
            {gap < 0
              ? `A objetiva bate na caixa: a lente ficaria ${Math.abs(gap).toFixed(1)} mm abaixo da lâmina. Recolha mais o tubo interno.`
              : `Lente a ${gap.toFixed(1)} mm acima da lâmina${Math.abs(gap - 0.8) < 0.3 ? " (foco nominal, distância de trabalho de 0,8 mm)" : ""}.`}
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
              <tr><td>Luva inferior ⌀</td><td>36 mm</td><td>não medido</td></tr>
              <tr><td>Comprimento total estendido</td><td>156,5 mm</td><td>155 mm</td></tr>
            </tbody>
          </table>
          <p className="small muted">O anel da abraçadeira (M2) segue o valor do paquímetro. A cabeça e as garras vêm do STEP. O gabarito C1 resolve a dúvida do tubo externo.</p>
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

const ELECTRICAL = /^(D|R|SW|BT|PS|J|U|RV|PCB)\d/;

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
              ? "BT1 → SW1 → R1 → D1 → BT1. Os conectores BT1, SW1 e D1 são os fios que saem da placa para as peças da caixa."
              : "J1 → SW1 → U1 (IN). U1 (OUT) → R1 → RV1 → ADJ → D1 → J1. R1 e RV1 em série ajustam a corrente do LED."}
          </figcaption>
        </figure>
        <Calculator version={version} />
        <section className="calc">
          <h4>No simulador</h4>
          <p className="small">
            Em <b>Projetos → Exemplos de referência</b> há o circuito {version === "v1" ? "“SUPORTE do PREGOSCÓPIO v1”" : "“SUPORTE do PREGOSCÓPIO v2”"} montado com as mesmas peças e os mesmos identificadores. Clique em <b>Executar</b>
            {version === "v1" ? " e no interruptor SW1 para ligar e desligar o LED." : ", clique no interruptor SW1 e gire o reostato RV1: o painel Laboratório mostra a corrente do LED de cerca de 5 a 26 mA."} Esses exemplos usam a API do simulador.
          </p>
          <p className="small muted">O simulador avalia só corrente contínua, com fonte ideal e LED por limiar; não substitui a medição com multímetro.</p>
        </section>
        <section className="wiring">
          <h4>Ordem das ligações</h4>
          {version === "v1" ? (
            <ol>
              <li>Fio vermelho do clipe BT1 ao primeiro terminal do interruptor SW1.</li>
              <li>Segundo terminal de SW1 a uma ponta de R1 (330 Ω).</li>
              <li>Outra ponta de R1 à perna mais longa de D1 (ânodo).</li>
              <li>Perna mais curta de D1 (cátodo) ao fio preto do clipe BT1.</li>
              <li>Meça a corrente com o multímetro em série: o esperado é cerca de 17,9 mA.</li>
            </ol>
          ) : (
            <ol>
              <li>Fonte PS1 (12 V, centro positivo) no conector J1; confira a polaridade antes.</li>
              <li>Positivo de J1 ao interruptor SW1; SW1 ao terminal IN do U1 (LM317). Negativo de J1 ao GND.</li>
              <li>OUT do U1 a R1 (47 Ω); R1 ao terminal 1 do RV1; os terminais 2 e 3 do RV1 ligados entre si.</li>
              <li>Terminais 2 e 3 de RV1 ao pino ADJ do U1 e ao ânodo de D1.</li>
              <li>Cátodo de D1 ao GND de J1.</li>
              <li>Meça a corrente com o multímetro em série: de cerca de 5 mA a 27 mA girando RV1.</li>
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
      </aside>
    </div>
  );
}

function Calculator({ version }: { version: SuporteVersion }) {
  const [vbat, setVbat] = useState(9);
  const [r1, setR1] = useState(330);
  const [vf, setVf] = useState(LED_VF);
  const [cap, setCap] = useState(BATTERY_MAH);
  const [vin, setVin] = useState(12);
  const [pot, setPot] = useState(0);
  const a = v1Light(vbat, r1, vf, cap);
  const b = v2Light(vin, 47, pot, vf);
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
            <dt>Corrente do LED</dt><dd>{a.currentmA.toFixed(1)} mA {a.currentmA > 20 ? <span className="error">acima de 20 mA</span> : null}</dd>
            <dt>Dissipação em R1</dt><dd>{a.resistorMilliwatts.toFixed(0)} mW de 250 mW</dd>
            <dt>Autonomia estimada</dt><dd>{a.hours.toFixed(0)} h</dd>
            <dt>R1 para 20 mA</dt><dd>{a.resistorForTarget.toFixed(0)} Ω</dd>
          </dl>
        </>
      ) : (
        <>
          <div className="row">
            <label>Fonte (V) {num(vin, setVin, { min: 3, max: 20, step: 0.5 })}</label>
            <label>Reostato RV1: {pot} Ω <input type="range" min={0} max={220} value={pot} onChange={(e) => setPot(Number(e.target.value))} /></label>
          </div>
          <dl>
            <dt>Corrente do LED</dt><dd>{b.currentmA.toFixed(1)} mA</dd>
            <dt>Resistência de ajuste (R1 + RV1)</dt><dd>{b.setOhms} Ω</dd>
            <dt>Dissipação no U1</dt><dd>{b.regulatorMilliwatts.toFixed(0)} mW</dd>
            <dt>Entrada mínima do U1</dt><dd>{b.minInputV.toFixed(2)} V {b.regulating ? "" : <span className="error">a fonte está abaixo</span>}</dd>
            <dt>Carga mínima do U1</dt><dd>{b.aboveMinLoad ? "atendida" : <span className="error">corrente abaixo de 3,5 mA, o LM317 pode oscilar</span>}</dd>
          </dl>
        </>
      )}
    </section>
  );
}

interface Series { name: string; id: string; sizes: string[]; param: string }
const JIGS: { id: string; file: string; title: string; series: Series[] }[] = [
  { id: "C1", file: "calibracao-tubo.stl", title: "Gabarito do tubo", series: [
    { name: "Tubo externo", id: "P2", sizes: ["30,2", "33,0", "33,4", "33,8", "34,2", "34,6", "36,4"], param: "tubeDiameter = valor escolhido − 0,2" },
  ] },
  { id: "C2", file: "calibracao-pecas.stl", title: "Gabarito das peças", series: [
    { name: "Lâmina (rebaixo de 1,2 mm)", id: "L1", sizes: ["26,2", "26,4", "26,6", "26,8", "27,0"], param: "slideWidth = valor escolhido − 0,6" },
    { name: "Interruptor KCD1-101", id: "SW1", sizes: ["20,8×14,6", "21,0×14,8", "21,2×15,0", "21,4×15,2", "21,6×15,4"], param: "switchCutout (largura e altura)" },
    { name: "Flange do LED", id: "D1", sizes: ["5,8", "6,0", "6,2", "6,4", "6,6"], param: "ledFlange = valor escolhido − 0,4" },
    { name: "Furo-piloto M3", id: "H1", sizes: ["2,4", "2,6", "2,8"], param: "pilotHole (entra apertado e rosqueia)" },
    { name: "Conector DC-022B", id: "J1", sizes: ["7,6", "7,8", "8,0", "8,2"], param: "jackDiameter" },
    { name: "Rosca M7 do reostato", id: "RV1", sizes: ["7,0", "7,3", "7,5", "7,8"], param: "knobDiameter" },
  ] },
  { id: "C3", file: "calibracao-bateria.stl", title: "Gabarito da bateria", series: [
    { name: "Bateria 9 V", id: "BT1", sizes: ["48,6×26,6", "49,1×27,1", "49,6×27,6", "50,1×28,1"], param: "batteryFit = valor escolhido − medida da bateria" },
  ] },
];

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
