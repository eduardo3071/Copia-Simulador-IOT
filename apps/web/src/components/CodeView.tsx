import { useEffect, useRef, useState } from "react";
import { api } from "../api.ts";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useApp, useProject } from "../store.ts";

type Monaco = Parameters<OnMount>[1];
type EditorInstance = Parameters<OnMount>[0];

export function CodeView() {
  const project = useProject()!;
  const compile = useApp((s) => s.compile);
  const dispatch = useApp((s) => s.dispatch);
  const file = project.firmware.files.find((f) => f.path === project.firmware.mainFile) ?? project.firmware.files[0]!;
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState<Record<string, string>>({});
  useEffect(() => {
    void api.health().then((h) => setAvailable(h.toolchain.libraries ?? {})).catch(() => {});
  }, []);
  const declared = new Set(project.firmware.libraries.map((l) => l.name));
  const toggleLibrary = (name: string, on: boolean) => {
    const next = project.firmware.libraries.filter((l) => l.name !== name);
    if (on) next.push({ name, version: available[name]! });
    dispatch({ type: "setLibraries", libraries: next });
  };

  // compiler diagnostics -> editor markers
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;
    monaco.editor.setModelMarkers(
      model,
      "arduino-cli",
      compile.diagnostics
        .filter((d) => d.file === file.path)
        .map((d) => ({
          startLineNumber: d.line,
          endLineNumber: d.line,
          startColumn: d.column ?? 1,
          endColumn: d.column ? d.column + 1 : model.getLineMaxColumn(Math.min(d.line, model.getLineCount())),
          message: d.message,
          severity: d.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        })),
    );
  }, [compile.diagnostics, file.path, ready]);

  return (
    <div className="code-view">
      <div className="code-header">
        <span className="file-tab">{file.path}</span>
        <span className="muted">
          {project.firmware.fqbn} • {project.firmware.core}
        </span>
      </div>
      <div className="libraries" title="Bibliotecas com versão fixa disponíveis no servidor">
        <span className="muted">Bibliotecas:</span>
        {Object.entries(available).map(([name, version]) => (
          <label key={name}>
            <input type="checkbox" checked={declared.has(name)} onChange={(e) => toggleLibrary(name, e.target.checked)} />
            {name} <small>{version}</small>
          </label>
        ))}
      </div>
      <div className="code-body">
        <Editor
          height="100%"
          language="cpp"
          theme="vs-dark"
          path={file.path}
          value={file.content}
          options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            setReady(true);
          }}
          onChange={(value) => dispatch({ type: "editSource", path: file.path, content: value ?? "" }, { coalesceKey: `src:${file.path}` })}
        />
      </div>
      {(compile.status === "error" || compile.status === "ok") && (
        <div className={`compile-output ${compile.status}`}>
          {compile.diagnostics.length > 0 && (
            <ul>
              {compile.diagnostics.map((d, i) => (
                <li key={i} className={d.severity} onClick={() => {
                  editorRef.current?.revealLineInCenter(d.line);
                  editorRef.current?.setPosition({ lineNumber: d.line, column: d.column ?? 1 });
                  editorRef.current?.focus();
                }}>
                  {d.file}:{d.line}
                  {d.column ? `:${d.column}` : ""} — {d.message}
                </li>
              ))}
            </ul>
          )}
          <pre>{compile.log}</pre>
        </div>
      )}
    </div>
  );
}