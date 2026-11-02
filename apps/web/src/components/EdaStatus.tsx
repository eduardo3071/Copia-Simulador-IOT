import { edaIsStale, useApp, useProject } from "../store.ts";

/** Shared header for schematic/PCB: says which revision is shown and whether it is outdated. */
export function EdaStatus({ children }: { children?: React.ReactNode }) {
  const project = useProject()!;
  const eda = useApp((s) => s.eda);
  const stale = useApp(edaIsStale);
  const refreshEda = useApp((s) => s.refreshEda);
  return (
    <div className="eda-status">
      {eda.status === "loading" && <span className="chip">Gerando a partir da revisão {project.revision}…</span>}
      {eda.result && !stale && eda.status !== "loading" && <span className="chip ok">Atualizado (rev. {eda.result.sourceRevision})</span>}
      {eda.result && stale && eda.status !== "loading" && (
        <span className="chip warn">Desatualizado: gerado na rev. {eda.result.sourceRevision}, o circuito mudou</span>
      )}
      {eda.status === "error" && <span className="chip error">{eda.error}</span>}
      <button onClick={() => void refreshEda()} disabled={eda.status === "loading"}>
        {eda.result ? "Atualizar" : "Gerar"}
      </button>
      {children}
    </div>
  );
}

export function EdaNotes() {
  const eda = useApp((s) => s.eda);
  if (!eda.result) return null;
  const { notes, diagnostics } = eda.result;
  if (!notes.length && !diagnostics.length) return null;
  return (
    <details className="eda-notes" open={diagnostics.some((d) => d.severity === "error")}>
      <summary>
        Limitações e verificações ({notes.length + diagnostics.length})
      </summary>
      <ul>
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
        {diagnostics.map((d, i) => (
          <li key={i} className={d.severity}>
            [{d.severity === "error" ? "erro" : "aviso"}] {d.message}
          </li>
        ))}
      </ul>
    </details>
  );
}