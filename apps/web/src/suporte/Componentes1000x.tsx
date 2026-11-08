import { COVER_GLASS, componentes1000x, derived1000x, layoutEconomica1000x, type Evidence1000 } from "@simiot/adapter-cad";

const EVIDENCE: Record<Evidence1000, string> = { fonte: "de uma página", medido: "medido", calculado: "calculado", suposto: "suposto: medir" };
const fixed = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/** Dimensions of every component of the economical 1000x version, as the 3D draws them, and what is still a guess. */
export function Componentes1000x({ selected, onSelect }: { selected: string | null; onSelect(id: string | null): void }) {
  const layout = layoutEconomica1000x();
  const list = componentes1000x(layout);
  const d = derived1000x(layout);
  const pick = list.find((c) => c.id === selected);
  const guesses = list.filter((c) => c.evidence === "suposto");
  return (
    <section className="calc">
      <h4>Versão 1000x econômica: dimensões</h4>
      <p className="small muted">
        Pregoscópio + objetiva 100x/1,25 em óleo + ocular WF10X, com LED de 3 W sob uma íris e o difusor, sem condensador. Cada medida diz de onde veio; as marcadas "suposto" precisam ser medidas na peça comprada.
      </p>
      <dl>
        <dt>Altura do suporte</dt><dd>{fixed(d.totalHeight)} mm (a versão 400x tem 228,2 mm)</dd>
        <dt>Tubo, do ombro da objetiva à borda</dt><dd>{fixed(d.tubeLength, 0)} mm de 160 mm</dd>
        <dt>Distância de trabalho (até a lamínula)</dt><dd>{fixed(d.workingDistance, 2)} mm, mais {fixed(COVER_GLASS, 2)} mm da lamínula</dd>
        <dt>LED até a íris</dt><dd>{fixed(d.emitterToIris)} mm</dd>
        <dt>LED a 350 mA</dt><dd>{fixed(d.ledWatts)} W elétricos, {fixed(d.heatWatts[0])} a {fixed(d.heatWatts[1])} W de calor (estimativa); folga do dissipador no tubo: {fixed(d.heatsinkClearance)} mm</dd>
      </dl>
      <table className="plan">
        <thead><tr><th>ID</th><th>Peça</th><th>Dimensões (mm)</th><th>Origem</th></tr></thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className={selected === c.id ? "on" : ""} onClick={() => onSelect(selected === c.id ? null : c.id)} style={{ cursor: "pointer" }}>
              <td className="mono">{c.id}</td>
              <td>{c.name}{c.printed ? " (impressa)" : ""}</td>
              <td className="small">{c.dims}</td>
              <td className={c.evidence === "suposto" ? "error small" : "small"}>{EVIDENCE[c.evidence]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pick && <p className="small"><b>{pick.id}:</b> {pick.note}</p>}
      <p className="small muted">
        Faltam medir em {guesses.length} peças ({guesses.map((c) => c.id).join(", ")}). Os fios não estão desenhados, e o ocular ainda não aparece no 3D porque não sei como ele se liga ao pregoscópio. O LED de 3 W roda a 350 mA para esquentar menos a caixa de PLA; o dissipador fica dentro dela e a tampa tem 12 furos de ventilação.
      </p>
    </section>
  );
}
