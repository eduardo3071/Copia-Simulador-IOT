import { useEffect, useState } from "react";
import { useApp } from "../store.ts";
import { EdaNotes, EdaStatus } from "./EdaStatus.tsx";

export function SchematicView() {
  const eda = useApp((s) => s.eda);
  const refreshEda = useApp((s) => s.refreshEda);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (eda.status === "idle") void refreshEda();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="eda-view">
      <EdaStatus>
        <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>−</button>
        <span className="zoom">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>+</button>
      </EdaStatus>
      <EdaNotes />
      <div className="schematic-scroll">
        {eda.result?.schematicSvg ? (
          <div
            className="schematic-svg"
            style={{ transform: `scale(${zoom})` }}
            // generated server-side by circuit-to-svg from our own Circuit JSON
            dangerouslySetInnerHTML={{ __html: eda.result.schematicSvg }}
          />
        ) : (
          <p className="muted">{eda.status === "loading" ? "Gerando esquemático…" : "Sem esquemático ainda."}</p>
        )}
      </div>
    </div>
  );
}