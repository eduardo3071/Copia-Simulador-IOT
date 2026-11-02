import { useEffect, useRef, useState } from "react";
import { PCBViewer } from "@tscircuit/pcb-viewer";
import { cornerMountingHoles, type Command } from "@simiot/project-model";
import { api, downloadBlob } from "../api.ts";
import { useApp, useProject } from "../store.ts";
import { EdaNotes, EdaStatus } from "./EdaStatus.tsx";

interface LocationEdit {
  edit_event_type: string;
  pcb_component_id: string;
  new_center: { x: number; y: number };
  in_progress?: boolean;
}

export function PcbView() {
  const project = useProject()!;
  const eda = useApp((s) => s.eda);
  const { refreshEda, dispatch, notify } = useApp.getState();
  const [exporting, setExporting] = useState(false);
  const [board, setBoard] = useState(project.pcb.board);
  useEffect(() => setBoard(project.pcb.board), [project.pcb.board]);
  // the viewer fits the board to the height it is given, so give it the real one
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(Math.max(200, Math.floor(entry!.contentRect.height))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (eda.status === "idle") void refreshEda();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const result = eda.result;

  /** pcb_component id -> project component id */
  const componentOf = (pcbComponentId: string): string | undefined => {
    if (!result) return undefined;
    const pcb = result.circuitJson.find((e) => e.type === "pcb_component" && e.pcb_component_id === pcbComponentId);
    const source = result.circuitJson.find((e) => e.type === "source_component" && e.source_component_id === pcb?.source_component_id);
    return result.parts.find((p) => p.name === source?.name)?.componentId;
  };

  /** Writes every part's current board position into the project (needed before manual edits). */
  const fixCommands = (overrides: Record<string, { x: number; y: number }> = {}): Command[] => {
    if (!result) return [];
    const commands: Command[] = [];
    for (const e of result.circuitJson) {
      if (e.type !== "pcb_component") continue;
      const id = componentOf(e.pcb_component_id);
      if (!id) continue;
      const center = overrides[id] ?? e.center;
      const rotation = project.pcb.placements[id]?.rotation ?? 0;
      commands.push({ type: "moveComponent", view: "pcb", componentId: id, placement: { x: round(center.x), y: round(center.y), rotation } });
    }
    return commands;
  };

  const onEdits = (events: unknown[]) => {
    const overrides: Record<string, { x: number; y: number }> = {};
    for (const event of events as LocationEdit[]) {
      if (event.edit_event_type !== "edit_pcb_component_location" || event.in_progress) continue;
      const id = componentOf(event.pcb_component_id);
      if (id) overrides[id] = event.new_center;
    }
    if (!Object.keys(overrides).length) return;
    if (dispatch({ type: "batch", label: "Mover na PCB", commands: fixCommands(overrides) })) void refreshEda();
  };

  const exportFab = async () => {
    setExporting(true);
    try {
      const { blob, name } = await api.fabrication(project);
      downloadBlob(blob, name);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="eda-view">
      <EdaStatus>
        <label>
          Placa (mm)
          <input type="number" min={10} max={300} value={board.width} onChange={(e) => setBoard({ ...board, width: Number(e.target.value) })} />
          ×
          <input type="number" min={10} max={300} value={board.height} onChange={(e) => setBoard({ ...board, height: Number(e.target.value) })} />
          <button
            onClick={() => dispatch({ type: "setBoardSize", width: board.width, height: board.height })}
            disabled={board.width === project.pcb.board.width && board.height === project.pcb.board.height}
          >
            Aplicar
          </button>
        </label>
        <label title="Furos de montagem (sem cobre) usados também pelos suportes do gabinete">
          Furos: {project.pcb.mountingHoles.length}
          <button onClick={() => dispatch({ type: "setMountingHoles", holes: cornerMountingHoles(project.pcb.board) }) && void refreshEda()}>
            4 cantos (M3)
          </button>
          {project.pcb.mountingHoles.length > 0 && (
            <button onClick={() => dispatch({ type: "setMountingHoles", holes: [] }) && void refreshEda()}>Remover</button>
          )}
        </label>
        {result?.autoPlaced && (
          <button onClick={() => dispatch({ type: "batch", label: "Fixar posições", commands: fixCommands() }) && void refreshEda()}>
            Fixar posições
          </button>
        )}
        <button className="primary" onClick={() => void exportFab()} disabled={exporting}>
          {exporting ? "Gerando…" : "Exportar fabricação (.zip)"}
        </button>
      </EdaStatus>
      <EdaNotes />
      <div className="pcb-body" ref={bodyRef}>
        {result ? (
          <PCBViewer
            key={`${result.inputsKey}-${result.sourceRevision}-${height}`}
            circuitJson={result.circuitJson as never}
            height={height}
            allowEditing
            editEvents={[]}
            onEditEventsChanged={(events) => onEdits(events)}
          />
        ) : (
          <p className="muted">{eda.status === "loading" ? "Gerando PCB…" : "Sem PCB ainda."}</p>
        )}
      </div>
      <p className="muted small">
        PCB de 2 camadas com autorroteamento do tscircuit. Sem paridade de DRC/planos de cobre com KiCad; inspecione os Gerbers em um visualizador independente.
      </p>
    </div>
  );
}

const round = (v: number) => Math.round(v * 100) / 100;