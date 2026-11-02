import { lazy, Suspense, useEffect, useState } from "react";
import { api } from "./api.ts";
import { useApp, type Tab } from "./store.ts";
import { BreadboardView } from "./components/BreadboardView.tsx";
import { CodeView } from "./components/CodeView.tsx";

import { Palette } from "./components/Palette.tsx";
import { PcbView } from "./components/PcbView.tsx";
import { ProjectDialog } from "./components/ProjectDialog.tsx";
import { Properties } from "./components/Properties.tsx";
import { SchematicView } from "./components/SchematicView.tsx";
import { SerialMonitor } from "./components/SerialMonitor.tsx";
import { SimBar } from "./components/SimBar.tsx";
import { Toolbar } from "./components/Toolbar.tsx";

// three.js and the 3D viewer load only when the Gabinete tab is opened
const EnclosureView = lazy(() => import("./components/EnclosureView.tsx").then((m) => ({ default: m.EnclosureView })));

const TABS: { id: Tab; label: string }[] = [
  { id: "breadboard", label: "Protoboard" },
  { id: "code", label: "Código" },
  { id: "schematic", label: "Esquemático" },
  { id: "pcb", label: "PCB" },
  { id: "enclosure", label: "Gabinete" },
];

export function App() {
  const hasProject = useApp((s) => s.history !== null);
  const tab = useApp((s) => s.tab);
  const toast = useApp((s) => s.toast);
  const [dialog, setDialog] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let last: string | null = null;
    try {
      last = localStorage.getItem("simiot:lastProject");
    } catch {
      /* storage unavailable */
    }
    const boot = last ? api.getProject(last).then((p) => useApp.getState().open(p)) : Promise.reject(new Error("none"));
    boot.catch(() => setDialog(true)).finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        void useApp.getState().save();
        return;
      }
      // Monaco and form fields keep their own undo stacks
      if (target.closest(".monaco-editor, input, textarea")) return;
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        useApp.getState().undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        useApp.getState().redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (booting) return <div className="boot">Carregando…</div>;
  if (!hasProject) return <ProjectDialog />;

  return (
    <div className="app">
      <Toolbar onOpenProjects={() => setDialog(true)} />
      <SimBar />
      <main className="workspace">
        <Palette />
        <section className="center">
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""} onClick={() => useApp.getState().setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="tab-body">
            {tab === "breadboard" && <BreadboardView />}
            {tab === "code" && <CodeView />}
            {tab === "schematic" && <SchematicView />}
            {tab === "pcb" && <PcbView />}
            {tab === "enclosure" && (
              <Suspense fallback={<p className="muted">Carregando o editor de gabinete…</p>}>
                <EnclosureView />
              </Suspense>
            )}
          </div>
          <SerialMonitor />
        </section>
        <Properties />
      </main>
      {dialog && <ProjectDialog onClose={() => setDialog(false)} />}
      {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}