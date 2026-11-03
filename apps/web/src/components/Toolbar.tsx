import { useRef } from "react";
import { API_HEADERS, api, downloadBlob } from "../api.ts";
import { isDirty, useApp, useProject } from "../store.ts";

export function Toolbar({ onOpenProjects }: { onOpenProjects: () => void }) {
  const project = useProject()!;
  const dispatch = useApp((s) => s.dispatch);
  const canUndo = useApp((s) => (s.history?.past.length ?? 0) > 0);
  const canRedo = useApp((s) => (s.history?.future.length ?? 0) > 0);
  const dirty = useApp(isDirty);
  const saveStatus = useApp((s) => s.saveStatus);
  const saveError = useApp((s) => s.saveError);
  const { undo, redo, save, open, notify } = useApp.getState();
  const fileInput = useRef<HTMLInputElement>(null);

  const duplicate = async () => {
    await save();
    const copy = await api.duplicateProject(project.id);
    open(copy);
    notify(`Duplicado como "${copy.title}"`);
  };

  const exportJson = async () => {
    await save();
    const response = await fetch(api.exportUrl(project.id), { headers: API_HEADERS });
    const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "projeto.json";
    downloadBlob(await response.blob(), name);
  };

  const importJson = async (file: File) => {
    try {
      const created = await api.createProject({ project: JSON.parse(await file.text()) });
      open(created);
      notify(`Importado: ${created.title}`);
    } catch (error) {
      notify(`Falha ao importar: ${(error as Error).message}`, "error");
    }
  };

  const status =
    saveStatus === "saving" ? "Salvando…" :
    saveStatus === "conflict" ? "Conflito: o projeto mudou em outra aba" :
    saveStatus === "error" ? `Erro ao salvar: ${saveError}` :
    dirty ? "Alterações não salvas" : "Salvo";

  return (
    <header className="toolbar">
      <div className="brand">Simulador IoT</div>
      <a className="suporte-link" href="#suporte" title="Peças, 3D, eletrônica e gabaritos do suporte do pregoscópio">Suporte do Pregoscópio</a>
      <input
        className="title-input"
        value={project.title}
        aria-label="Título do projeto"
        onChange={(e) => e.target.value.trim() && dispatch({ type: "setTitle", title: e.target.value }, { coalesceKey: "title" })}
      />
      <span className="revision" title="Revisão do projeto: cada edição gera uma nova">rev. {project.revision}</span>
      <div className="group">
        <button onClick={onOpenProjects}>Projetos</button>
        <button onClick={() => void save()} disabled={!dirty || saveStatus === "saving"}>Salvar</button>
        <button onClick={() => void duplicate()}>Duplicar</button>
        <button onClick={() => void exportJson()}>Exportar</button>
        <button onClick={() => fileInput.current?.click()}>Importar</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importJson(file);
            e.target.value = "";
          }}
        />
      </div>
      <div className="group">
        <button onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">↶</button>
        <button onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Y)">↷</button>
      </div>
      <span className={`save-status ${saveStatus}`}>{status}</span>
      {saveStatus === "conflict" && (
        <button onClick={async () => open(await api.getProject(project.id))} title="Descarta as alterações desta aba e abre a última versão salva">
          Recarregar versão salva
        </button>
      )}
    </header>
  );
}