import { useMemo, useState } from "react";
import {
  EYEPIECE_SPEC, FAULT_LABEL, IMAGE_BELOW_SEAT, LM317_MIN_LOAD, NOMINAL_EXTENSION, NOMINAL_PARTS, PART_SPREAD, STANDARD_TUBE_LENGTH, SUPPLIES, TUBE_GEOMETRY,
  faultsFor, opticsAt, randomParts, runTest, seededRandom, type FaultId, type SimParts, type SimVersion,
} from "@simiot/adapter-cad";

const fixed = (n: number, d: number) => n.toFixed(d).replace(".", ",");

const VERDICT_TEXT = {
  ideal: ["ideal", ""],
  aceitavel: ["aceitável, com imagem um pouco mais mole", "muted"],
  curto: ["curto demais para a objetiva 160/0,17", "error"],
  longo: ["longo demais para a objetiva 160/0,17", "error"],
} as const;

/** The two lenses were made for a 160 mm tube: how long the real tubes are for each position of the inner tube. */
export function TubeOptics() {
  const [ext, setExt] = useState(NOMINAL_EXTENSION);
  const o = opticsAt(ext);
  const [text, cls] = VERDICT_TEXT[o.verdict];
  return (
    <section className="calc">
      <h4>Comprimento do tubo e óptica (objetiva 40x/0,65 + ocular WF10X)</h4>
      <p className="small muted">
        A objetiva é marcada 160/0,17: foi calculada para 160 mm entre o ombro da rosca RMS (onde ela encosta) e o ombro do ocular (a borda do tubo onde ele apoia).
        A imagem intermediária se forma {IMAGE_BELOW_SEAT} mm abaixo dessa borda. Aqui o tubo externo tem {TUBE_GEOMETRY.outerLength} mm e o interno sai de 0 a {TUBE_GEOMETRY.innerTravel} mm.
      </p>
      <div className="row">
        <label>Tubo interno estendido: <b>{fixed(ext, 1)} mm</b> <input type="range" min={0} max={TUBE_GEOMETRY.innerTravel} step={0.5} value={ext} onChange={(e) => setExt(Number(e.target.value))} /></label>
        <button onClick={() => setExt(NOMINAL_EXTENSION)}>Posição de trabalho ({NOMINAL_EXTENSION} mm)</button>
      </div>
      <dl>
        <dt>Comprimento mecânico do tubo</dt>
        <dd>{fixed(o.tubeLength, 1)} mm de {STANDARD_TUBE_LENGTH} mm ({o.deviation >= 0 ? "+" : ""}{fixed(o.deviation, 1)} mm) <span className={cls}>{text}</span></dd>
        <dt>Aumento total estimado</dt>
        <dd>{fixed(o.totalMagnification, 0)}x de {o.nominalTotalMagnification}x nominais (estimativa proporcional ao comprimento)</dd>
        <dt>Ocular de ⌀{fixed(EYEPIECE_SPEC.barrelDiameter, 1)} mm</dt>
        <dd>cabe no tubo externo (⌀{fixed(TUBE_GEOMETRY.outerDiameter, 1)}, parede de até {fixed(o.maxOuterWall, 1)} mm); <span className="error">não cabe no tubo interno</span> (⌀{fixed(TUBE_GEOMETRY.innerDiameter, 1)})</dd>
        <dt>Extensão para 160 mm</dt>
        <dd>{STANDARD_TUBE_LENGTH - TUBE_GEOMETRY.outerLength} mm, mais que os {TUBE_GEOMETRY.innerTravel} mm de curso: com este tubo e o ocular na borda, o comprimento nunca chega a 160 mm</dd>
      </dl>
      <p className="small muted">
        A regra de 5 mm (ideal) e 15 mm (aceitável) é uma estimativa do projeto, não uma norma. Confirme no pregoscópio real a distância do ombro da objetiva até a borda onde o ocular apoia.
      </p>
    </section>
  );
}

/** Virtual multimeter: every point of the test plan, from real part values, with a fault the learner can inject. */
export function SimulatedTest({ version }: { version: SimVersion }) {
  const [supplyIdx, setSupplyIdx] = useState(0);
  const [fault, setFault] = useState<FaultId>("nenhuma");
  const [parts, setParts] = useState<SimParts>(NOMINAL_PARTS);
  const [draw, setDraw] = useState(0);
  const [shown, setShown] = useState(0);
  const supply = SUPPLIES[version][supplyIdx] ?? SUPPLIES[version][0]!;
  const readings = useMemo(() => runTest({ version, parts, supply, fault, pot: 0 }), [version, parts, supply, fault]);
  const bad = readings.findIndex((r) => !r.ok);
  const last = readings[readings.length - 1]!;
  return (
    <section className="calc">
      <h4>Teste elétrico simulado (multímetro virtual)</h4>
      <p className="small muted">
        Calcula cada leitura do plano acima com valores reais de peças: referência do LM317 de 1,2 a 1,3 V, LED branco de 2,8 a 3,4 V, R1 de 1 %, reostato de ±20 %, pilha ou fonte com queda sob carga.
        Escolha uma falha para ver onde a primeira leitura sai da faixa.
      </p>
      <div className="row">
        <label>{version === "v1" ? "Pilha" : "Fonte"}{" "}
          <select value={supplyIdx} onChange={(e) => { setSupplyIdx(Number(e.target.value)); setShown(0); }}>
            {SUPPLIES[version].map((s, i) => <option key={s.label} value={i}>{s.label} ({fixed(s.openV, 1)} V)</option>)}
          </select>
        </label>
        <label>Falha{" "}
          <select value={fault} onChange={(e) => { setFault(e.target.value as FaultId); setShown(0); }}>
            {faultsFor(version).map((f) => <option key={f} value={f}>{FAULT_LABEL[f]}</option>)}
          </select>
        </label>
        <button onClick={() => { const n = draw + 1; setDraw(n); setParts(randomParts(seededRandom(n * 7919))); }}>Sortear peças reais</button>
        <button onClick={() => { setDraw(0); setParts(NOMINAL_PARTS); }}>Peças nominais</button>
      </div>
      <p className="small muted">
        Peças em uso: referência {fixed(parts.vref, 3)} V · LED {fixed(parts.vf20, 2)} V a 20 mA · R1 {fixed(parts.r1, 1)} Ω
        {version === "v2" ? ` · RV1 ${fixed(parts.rv1, 0)} Ω` : ""} · corrente do pino ADJ {fixed(parts.iadj * 1e6, 0)} µA. Sorteio dentro de {PART_SPREAD.vref[0]} a {PART_SPREAD.vref[1]} V, {PART_SPREAD.vf20[0]} a {PART_SPREAD.vf20[1]} V e R1 ±1 %.
      </p>
      <table className="plan">
        <thead><tr><th>#</th><th>Ponto</th><th>Faixa</th><th>Leitura</th><th /></tr></thead>
        <tbody>
          {readings.map((r, i) => (
            <tr key={r.row.point}>
              <td>{i + 1}</td>
              <td>{r.row.point}</td>
              <td className="mono">{fixed(r.low, r.row.unit === "V" ? 2 : 1)} a {fixed(r.high, r.row.unit === "V" ? 2 : 1)} {r.row.unit}</td>
              <td className="mono"><b>{i <= shown ? r.text : "—"}</b></td>
              <td className={i <= shown && !r.ok ? "error" : ""}>{i <= shown ? (r.ok ? "OK" : "FORA") : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button disabled={shown >= readings.length - 1} onClick={() => setShown(shown + 1)}>Medir o próximo ponto</button>
        <button onClick={() => setShown(readings.length - 1)}>Medir tudo</button>
        <button onClick={() => setShown(0)}>Recomeçar</button>
      </div>
      {bad >= 0 && bad <= shown && <p className="error small">Primeira leitura fora da faixa: ponto {bad + 1}. {readings[bad]!.row.hint}</p>}
      {bad < 0 && shown >= readings.length - 1 && <p className="small">Todas as leituras estão dentro da faixa: a montagem passa neste teste.</p>}
      {version === "v2" && (
        <p className="small muted">
          Com o reostato no máximo a corrente cai a {fixed(last.value, 1)} mA. O LM317 pede de {LM317_MIN_LOAD.typical} mA (típico) até {LM317_MIN_LOAD.maxST} mA (ST) ou {LM317_MIN_LOAD.maxTI} mA (TI) de carga mínima, conforme o fabricante:
          num regulador exigente o brilho mínimo pode oscilar ou a saída subir. O teste de bancada com o reostato no máximo mostra isso.
        </p>
      )}
    </section>
  );
}
