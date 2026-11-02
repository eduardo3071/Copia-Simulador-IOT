import { useEffect, useState } from "react";
import { withStlHeader } from "@simiot/adapter-cad";
import {
  enclosureIsStale,
  EnclosureParams,
  newId,
  type Cutout,
  type CutoutFace,
} from "@simiot/project-model";
import { downloadBlob } from "../api.ts";
import { enclosureGeometryKey } from "../cad/client.ts";
import { useApp, useProject } from "../store.ts";
import { EnclosureViewer, type ViewerOptions } from "./EnclosureViewer.tsx";

const PARAMS: { key: keyof EnclosureParams; label: string; hint: string }[] = [
  { key: "wall", label: "Espessura", hint: "Paredes, fundo e tampa" },
  { key: "clearance", label: "Folga PCB ↔ parede", hint: "Por lado" },
  { key: "standoffHeight", label: "Altura dos suportes", hint: "Do fundo até a face de baixo da PCB" },
  { key: "headroom", label: "Espaço acima da PCB", hint: "Da face de cima da PCB até a tampa" },
  { key: "lipHeight", label: "Aba da tampa", hint: "Encaixe que entra na base (0 = tampa lisa)" },
  { key: "fit", label: "Folga da aba", hint: "Entre a aba e a parede, por lado" },
];

const FACES: { id: CutoutFace; label: string }[] = [
  { id: "front", label: "Frente (−Y)" },
  { id: "back", label: "Fundo (+Y)" },
  { id: "left", label: "Esquerda (−X)" },
  { id: "right", label: "Direita (+X)" },
  { id: "lid", label: "Tampa" },
];

/** The two board axes a cutout uses on each face (the normal axis is ignored). */
const AXES: Record<CutoutFace, [keyof Cutout & ("x" | "y" | "z"), keyof Cutout & ("x" | "y" | "z")]> = {
  front: ["x", "z"],
  back: ["x", "z"],
  left: ["y", "z"],
  right: ["y", "z"],
  lid: ["x", "y"],
};

const fmt = (v: number) => (Math.round(v * 100) / 100).toString().replace(".", ",");
const slug = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto";

function NumberInput({ value, min, max, step = 0.1, onCommit }: { value: number; min?: number; max?: number; step?: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text.replace(",", "."));
    if (text.trim() !== "" && Number.isFinite(n) && n !== value) onCommit(n);
    else setText(String(value));
  };
  return (
    <input
      type="number"
      value={text}
      min={min}
      max={max}
      step={step}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

function CutoutEditor({ cutout }: { cutout: Cutout }) {
  const { dispatch } = useApp.getState();
  const update = (changes: Partial<Omit<Cutout, "id">>, field: string) =>
    dispatch({ type: "updateCutout", cutoutId: cutout.id, changes }, { coalesceKey: `cut:${cutout.id}:${field}` });
  const [a, b] = AXES[cutout.face];
  const circle = cutout.shape === "circle";
  return (
    <div className="cutout">
      <div className="row">
        <input value={cutout.label} placeholder="Nome" aria-label="Nome do recorte" onChange={(e) => update({ label: e.target.value }, "label")} />
        <button className="danger" title="Remover recorte" onClick={() => dispatch({ type: "removeCutout", cutoutId: cutout.id })}>
          ×
        </button>
      </div>
      <div className="row">
        <select value={cutout.face} aria-label="Face" onChange={(e) => update({ face: e.target.value as CutoutFace }, "face")}>
          {FACES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={cutout.shape}
          aria-label="Forma"
          onChange={(e) => update(e.target.value === "circle" ? { shape: "circle", height: cutout.width } : { shape: "rect" }, "shape")}
        >
          <option value="rect">Retângulo</option>
          <option value="circle">Círculo</option>
        </select>
      </div>
      <div className="cutout-grid">
        <label>
          {a.toUpperCase()}
          <NumberInput value={cutout[a]} onCommit={(v) => update({ [a]: v }, a)} />
        </label>
        <label title={b === "z" ? "Medido a partir da face de cima da PCB" : undefined}>
          {b === "z" ? "Z (PCB)" : b.toUpperCase()}
          <NumberInput value={cutout[b]} onCommit={(v) => update({ [b]: v }, b)} />
        </label>
        {circle ? (
          <label>
            Diâmetro
            <NumberInput value={cutout.width} min={0.1} onCommit={(v) => update({ width: v, height: v }, "size")} />
          </label>
        ) : (
          <>
            <label>
              Largura
              <NumberInput value={cutout.width} min={0.1} onCommit={(v) => update({ width: v }, "width")} />
            </label>
            <label>
              Altura
              <NumberInput value={cutout.height} min={0.1} onCommit={(v) => update({ height: v }, "height")} />
            </label>
          </>
        )}
      </div>
    </div>
  );
}

export function EnclosureView() {
  const project = useProject()!;
  const cad = useApp((s) => s.cad);
  const { dispatch, buildEnclosure } = useApp.getState();
  const [options, setOptions] = useState<ViewerOptions>({ showLid: true, exploded: true, showPcb: true });
  const enclosure = project.enclosure;
  const stale = enclosureIsStale(project);
  const geometryKey = enclosure ? enclosureGeometryKey(project) : "";
  const result = cad.result;
  const current = !!result && result.geometryKey === geometryKey;

  // Parameter and cutout edits regenerate on their own; a changed PCB waits for "Atualizar".
  useEffect(() => {
    if (!enclosure || stale || current) return;
    const timer = setTimeout(() => void buildEnclosure(), 250);
    return () => clearTimeout(timer);
  }, [geometryKey, stale, current]); // eslint-disable-line react-hooks/exhaustive-deps

  const holes = project.pcb.mountingHoles;
  if (!enclosure) {
    return (
      <div className="enclosure-empty">
        <h3>Gabinete paramétrico</h3>
        <p className="muted">
          Base e tampa geradas a partir do contorno da PCB ({fmt(project.pcb.board.width)} × {fmt(project.pcb.board.height)} mm) com suportes nos furos de montagem.
          Os recortes para conectores são definidos à mão. Exporta STL para impressão 3D.
        </p>
        {holes.length === 0 && <p className="chip warn">A PCB não tem furos de montagem: adicione-os na aba PCB para ter suportes.</p>}
        <button className="primary" onClick={() => dispatch({ type: "createEnclosure" })}>
          Criar gabinete
        </button>
      </div>
    );
  }

  const exportStl = (part: "base" | "lid") => {
    if (!result) return;
    const rev = result.sourceRevision;
    const name = part === "base" ? "base" : "tampa";
    const stl = withStlHeader(result[part].stl, `Simulador IoT - ${project.title} - gabinete ${name} - rev. ${rev}`);
    downloadBlob(new Blob([stl], { type: "model/stl" }), `${slug(project.title)}-gabinete-${name}-rev${rev}.stl`);
  };

  const addCutout = () => {
    const cutout: Cutout = { id: newId("cut"), label: `Recorte ${enclosure.cutouts.length + 1}`, face: "front", shape: "rect", x: 0, y: 0, z: 4, width: 10, height: 6 };
    dispatch({ type: "addCutout", cutout });
  };

  const layout = result?.layout;
  const canExport = !!result && current && !stale && cad.status !== "building";

  return (
    <div className="enclosure-view">
      <div className="enclosure-main">
        <div className="eda-status">
          {cad.status === "building" && <span className="chip">Gerando a partir da revisão {project.revision}…</span>}
          {stale && (
            <span className="chip warn">Desatualizado: gerado na rev. {enclosure.sourceRevision}, a PCB mudou. Confira os recortes e atualize.</span>
          )}
          {!stale && current && cad.status === "ready" && (
            <span className="chip ok">
              Atualizado (rev. {result.sourceRevision}, {result.durationMs} ms)
            </span>
          )}
          {cad.status === "error" && <span className="chip error">{cad.error}</span>}
          <button className={stale ? "primary" : ""} onClick={() => void buildEnclosure()} disabled={cad.status === "building"}>
            {stale ? "Atualizar a partir da PCB" : "Atualizar"}
          </button>
          <button onClick={() => exportStl("base")} disabled={!canExport} title={canExport ? undefined : "Atualize o gabinete antes de exportar"}>
            Base (.stl)
          </button>
          <button onClick={() => exportStl("lid")} disabled={!canExport} title={canExport ? undefined : "Atualize o gabinete antes de exportar"}>
            Tampa (.stl)
          </button>
          {layout && (
            <span className="muted small">
              Externo {fmt(layout.outer.width)} × {fmt(layout.outer.depth)} × {fmt(layout.totalHeight)} mm
            </span>
          )}
        </div>
        {layout && layout.issues.length > 0 && (
          <ul className="enclosure-issues">
            {layout.issues.map((issue, i) => (
              <li key={i} className={issue.severity}>
                [{issue.severity === "error" ? "erro" : "aviso"}] {issue.message}
              </li>
            ))}
          </ul>
        )}
        <div className="enclosure-canvas">
          {result ? (
            <EnclosureViewer layout={result.layout} base={result.base.mesh} lid={result.lid.mesh} options={options} />
          ) : (
            <p className="muted">
              {cad.status === "building" ? "Carregando o núcleo CAD (OpenCascade) e gerando…" : stale ? "A PCB mudou desde a última geração." : "Sem geometria ainda."}
            </p>
          )}
        </div>
        <div className="row small">
          <label>
            <input type="checkbox" checked={options.showLid} onChange={(e) => setOptions({ ...options, showLid: e.target.checked })} /> Tampa
          </label>
          <label>
            <input type="checkbox" checked={options.exploded} onChange={(e) => setOptions({ ...options, exploded: e.target.checked })} /> Explodir
          </label>
          <label>
            <input type="checkbox" checked={options.showPcb} onChange={(e) => setOptions({ ...options, showPcb: e.target.checked })} /> PCB
          </label>
          <span className="muted">Arraste para girar, roda para zoom. A tampa é exportada virada (face externa para baixo).</span>
        </div>
      </div>

      <aside className="enclosure-side">
        <h4>Parâmetros (mm)</h4>
        {PARAMS.map((param) => (
          <label key={param.key} className="field" title={param.hint}>
            <span>{param.label}</span>
            <NumberInput
              value={enclosure.params[param.key]}
              min={0}
              onCommit={(v) => dispatch({ type: "setEnclosureParams", params: { [param.key]: v } })}
            />
          </label>
        ))}

        <h4>Furos de montagem (PCB)</h4>
        {holes.length ? (
          <ul className="hole-list">
            {holes.map((h) => (
              <li key={h.id}>
                {h.id}: ({fmt(h.x)}; {fmt(h.y)}) ⌀{fmt(h.diameter)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">Nenhum. Adicione na aba PCB ("4 cantos").</p>
        )}

        <h4>Recortes manuais</h4>
        <p className="note">
          Posição em mm no sistema da placa (origem no centro, +Y para cima na PCB). Nas paredes, Z é a altura do centro acima da face de cima da PCB.
          Nada é inferido da aparência das peças: confira os conectores na aba PCB.
        </p>
        {enclosure.cutouts.map((cutout) => (
          <CutoutEditor key={cutout.id} cutout={cutout} />
        ))}
        <button onClick={addCutout}>+ Recorte</button>

        <div className="enclosure-remove">
          <button className="danger" onClick={() => confirm("Remover o gabinete deste projeto?") && dispatch({ type: "removeEnclosure" })}>
            Remover gabinete
          </button>
        </div>
      </aside>
    </div>
  );
}
