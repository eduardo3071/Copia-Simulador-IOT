import { catalog } from "@simiot/component-catalog";
import { addPart } from "../lib/editing.ts";
import { useApp, useProject } from "../store.ts";

const CATEGORY: Record<string, string> = {
  board: "Placas",
  prototyping: "Montagem",
  power: "Alimentação",
  passive: "Passivos",
  output: "Saídas",
  input: "Entradas",
};

export function Palette() {
  const project = useProject()!;
  const { dispatch, select, setTab } = useApp.getState();
  const add = (definitionId: string) => {
    const n = project.components.length;
    const { command, id } = addPart(project, definitionId, { x: 60 + (n % 6) * 30, y: 300 + (n % 4) * 30 });
    if (dispatch(command)) {
      select({ kind: "component", id });
      setTab("breadboard");
    }
  };
  return (
    <aside className="palette">
      <h3>Componentes</h3>
      {Object.entries(CATEGORY).map(([category, label]) => (
        <div key={category} className="palette-group">
          <h4>{label}</h4>
          {catalog
            .filter((d) => d.category === category)
            .map((d) => (
              <button key={d.id} className="palette-item" onClick={() => add(d.id)} title={`Adicionar ${d.name}`}>
                <span>{d.name}</span>
                <span className="caps">
                  {d.capabilities.simulable && <i title="Simulável">S</i>}
                  {d.capabilities.fabricable && <i title="Fabricável (footprint verificado)">F</i>}
                  {d.capabilities.model3d && <i title="Modelo 3D">3D</i>}
                </span>
              </button>
            ))}
        </div>
      ))}
      <p className="note">Catálogo reduzido e verificado: pinagem, footprint e visual conferidos por testes.</p>
    </aside>
  );
}