import { create } from "zustand";
import {
  CommandError,
  circuitInputsKey,
  createHistory,
  enclosureInputsKey,
  enclosureIsStale,
  execute,
  firmwareInputsKey,
  isStale,
  markEnclosureGenerated,
  redo,
  reset,
  undo,
  type Command,
  type HistoryState,
  type Project,
} from "@simiot/project-model";
import { ApiError, api, type Diagnostic, type EdaResult } from "./api.ts";
import { SimulationController, type SimSnapshot } from "./sim/controller.ts";
import { CadClient, enclosureGeometryKey, type BuiltEnclosure } from "./cad/client.ts";

export type Tab = "breadboard" | "code" | "schematic" | "pcb" | "enclosure";
export type Selection = { kind: "component" | "connection"; id: string } | null;

interface CompileState {
  status: "idle" | "running" | "ok" | "error";
  diagnostics: Diagnostic[];
  log: string;
  jobId?: string;
}

interface EdaState {
  status: "idle" | "loading" | "ready" | "error";
  result?: EdaResult;
  error?: string;
}

interface CadState {
  status: "idle" | "building" | "ready" | "error";
  /** Geometry plus the model state it was built from. */
  result?: BuiltEnclosure & { geometryKey: string; sourceRevision: number };
  error?: string;
}

interface AppState {
  history: HistoryState | null;
  saved: Project | null;
  saveStatus: "idle" | "saving" | "error" | "conflict";
  saveError?: string;
  tab: Tab;
  selection: Selection;
  compile: CompileState;
  hex: { hash: string; text: string } | null;
  eda: EdaState;
  cad: CadState;
  sim: SimSnapshot;
  serial: string;
  toast?: { text: string; kind: "info" | "error" };

  open(project: Project): void;
  dispatch(command: Command, options?: { coalesceKey?: string }): boolean;
  undo(): void;
  redo(): void;
  save(): Promise<void>;
  setTab(tab: Tab): void;
  select(selection: Selection): void;
  notify(text: string, kind?: "info" | "error"): void;
  compileFirmware(): Promise<boolean>;
  cancelCompile(): Promise<void>;
  run(): Promise<void>;
  pause(): void;
  resume(): void;
  resetSim(): void;
  stopSim(): void;
  press(componentId: string, down: boolean): void;
  setPot(componentId: string, position: number): void;
  sendSerial(text: string): void;
  clearSerial(): void;
  refreshEda(): Promise<void>;
  buildEnclosure(): Promise<void>;
}

export const sim = new SimulationController((snapshot, serial) => useApp.setState({ sim: snapshot, serial }));
const cad = new CadClient();
/** Only the answer to the latest enclosure request is shown. */
let cadRequest = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useApp = create<AppState>((set, get) => ({
  history: null,
  saved: null,
  saveStatus: "idle",
  tab: "breadboard",
  selection: null,
  compile: { status: "idle", diagnostics: [], log: "" },
  hex: null,
  eda: { status: "idle" },
  cad: { status: "idle" },
  sim: sim.state,
  serial: "",

  open(project) {
    sim.stop();
    set({
      history: createHistory(project),
      saved: project,
      saveStatus: "idle",
      saveError: undefined,
      selection: null,
      compile: { status: "idle", diagnostics: [], log: "" },
      hex: null,
      eda: { status: "idle" },
      cad: { status: "idle" },
      serial: "",
    });
    try {
      localStorage.setItem("simiot:lastProject", project.id);
    } catch {
      /* storage unavailable: only a convenience */
    }
  },

  dispatch(command, options) {
    const { history } = get();
    if (!history) return false;
    try {
      const next = execute(history, command, options);
      if (next === history) return false;
      set({ history: next });
      return true;
    } catch (error) {
      if (error instanceof CommandError) {
        get().notify(error.message, "error");
        return false;
      }
      throw error;
    }
  },

  undo() {
    const { history } = get();
    if (history) set({ history: undo(history) });
  },

  redo() {
    const { history } = get();
    if (history) set({ history: redo(history) });
  },

  async save() {
    const project = get().history?.present;
    if (!project) return;
    set({ saveStatus: "saving" });
    try {
      await api.saveProject(project);
      // keep the user's newer edits made while the request was in flight
      set({ saved: project, saveStatus: "idle", saveError: undefined });
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409;
      set({ saveStatus: conflict ? "conflict" : "error", saveError: (error as Error).message });
    }
  },

  setTab(tab) {
    set({ tab });
  },

  select(selection) {
    set({ selection });
  },

  notify(text, kind = "info") {
    set({ toast: { text, kind } });
    setTimeout(() => {
      if (get().toast?.text === text) set({ toast: undefined });
    }, 4000);
  },

  async compileFirmware() {
    const project = get().history?.present;
    if (!project) return false;
    const inputsKey = firmwareInputsKey(project);
    set({ compile: { status: "running", diagnostics: [], log: "" } });
    try {
      let job = await api.compile(project.firmware);
      set((s) => ({ compile: { ...s.compile, jobId: job.id } }));
      while (job.status === "queued" || job.status === "running") {
        await sleep(250);
        job = await api.compileStatus(job.id);
      }
      const result = job.result;
      if (!result || !result.ok) {
        set({
          compile: {
            status: "error",
            diagnostics: result && !result.ok ? result.diagnostics : [],
            log: result?.log ?? (job.status === "cancelled" ? "Compilação cancelada." : "Falha desconhecida."),
          },
        });
        return false;
      }
      const history = get().history;
      if (history) {
        const current = history.present;
        // derived data: recorded without a new revision or undo step
        const artifact = { hash: result.cacheKey, inputsKey, sourceRevision: project.revision, createdAt: new Date().toISOString() };
        set({ history: reset(history, { ...current, artifacts: { ...current.artifacts, firmware: artifact } }, true) });
      }
      set({
        compile: { status: "ok", diagnostics: [], log: result.log || `Compilado em ${result.durationMs} ms${result.cached ? " (cache)" : ""}.` },
        hex: { hash: result.cacheKey, text: result.hex },
      });
      return true;
    } catch (error) {
      set({ compile: { status: "error", diagnostics: [], log: (error as Error).message } });
      return false;
    }
  },

  async cancelCompile() {
    const jobId = get().compile.jobId;
    if (jobId) await api.cancelCompile(jobId).catch(() => {});
  },

  async run() {
    let project = get().history?.present;
    if (!project) return;
    if (isStale(project.artifacts.firmware, firmwareInputsKey(project))) {
      const ok = await get().compileFirmware();
      if (!ok) {
        get().setTab("code");
        get().notify("Corrija os erros de compilação antes de executar.", "error");
        return;
      }
      project = get().history!.present;
    }
    const artifact = project.artifacts.firmware!;
    let hex = get().hex;
    if (!hex || hex.hash !== artifact.hash) {
      try {
        hex = { hash: artifact.hash, text: await api.artifact(artifact.hash) };
        set({ hex });
      } catch {
        // cache was cleared on the server: rebuild
        if (!(await get().compileFirmware())) return;
        hex = get().hex!;
      }
    }
    sim.start(hex.text, project);
  },

  pause: () => sim.pause(),
  resume: () => sim.resume(),
  resetSim: () => sim.reset(),
  stopSim: () => sim.stop(),
  press: (id, down) => sim.press(id, down),
  setPot: (id, position) => sim.setPot(id, position),
  sendSerial: (text) => sim.sendSerial(text),
  clearSerial() {
    sim.serial = "";
    set({ serial: "" });
  },

  async refreshEda() {
    const project = get().history?.present;
    if (!project) return;
    set((s) => ({ eda: { ...s.eda, status: "loading" } }));
    try {
      const result = await api.eda(project);
      set({ eda: { status: "ready", result } });
    } catch (error) {
      set((s) => ({ eda: { ...s.eda, status: "error", error: (error as Error).message } }));
    }
  },

  async buildEnclosure() {
    const project = get().history?.present;
    if (!project?.enclosure) return;
    const requestId = ++cadRequest;
    const geometryKey = enclosureGeometryKey(project);
    set((s) => ({ cad: { ...s.cad, status: "building", error: undefined } }));
    try {
      const built = await cad.build(project.pcb, project.enclosure);
      if (requestId !== cadRequest) return;
      set({ cad: { status: "ready", result: { ...built, geometryKey, sourceRevision: project.revision } } });
      // derived data, like a compiled firmware: record which PCB it was fitted to, without a new revision
      const history = get().history;
      const current = history?.present;
      if (history && current && enclosureIsStale(current) && enclosureInputsKey(current) === enclosureInputsKey(project)) {
        set({ history: reset(history, markEnclosureGenerated(current), true) });
      }
    } catch (error) {
      if (requestId !== cadRequest) return;
      set((s) => ({ cad: { ...s.cad, status: "error", error: (error as Error).message } }));
    }
  },
}));

export const useProject = () => useApp((s) => s.history?.present ?? null);
export const isDirty = (s: AppState) => !!s.history && s.history.present !== s.saved;
export const edaIsStale = (s: AppState) =>
  !s.eda.result || !s.history || s.eda.result.inputsKey !== circuitInputsKey(s.history.present);

// Keep the running lab in sync with circuit edits made during simulation.
let lastCircuit: unknown;
useApp.subscribe((state) => {
  const project = state.history?.present;
  if (!project) return;
  const circuit = [project.components, project.connections];
  if (lastCircuit && (circuit[0] !== (lastCircuit as unknown[])[0] || circuit[1] !== (lastCircuit as unknown[])[1])) {
    sim.setProject(project);
  }
  lastCircuit = circuit;
});

// Autosave a couple of seconds after the last edit.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useApp.subscribe((state, previous) => {
  if (state.history?.present === previous.history?.present || !isDirty(state)) return;
  if (state.saveStatus === "conflict") return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void useApp.getState().save(), 2000);
});