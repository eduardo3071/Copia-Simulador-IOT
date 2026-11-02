import { firmwareInputsKey, isStale } from "@simiot/project-model";
import { useApp, useProject } from "../store.ts";

export function SimBar() {
  const project = useProject()!;
  const compile = useApp((s) => s.compile);
  const sim = useApp((s) => s.sim);
  const { compileFirmware, cancelCompile, run, pause, resume, resetSim, stopSim } = useApp.getState();
  const stale = isStale(project.artifacts.firmware, firmwareInputsKey(project));
  const active = sim.runState === "running" || sim.runState === "paused" || sim.runState === "loaded";
  const compiling = compile.status === "running";

  return (
    <div className="simbar">
      <button onClick={() => void compileFirmware()} disabled={compiling}>
        {compiling ? "Compilando…" : "Compilar"}
      </button>
      {compiling && <button onClick={() => void cancelCompile()}>Cancelar</button>}
      {!active && (
        <button className="primary" onClick={() => void run()} disabled={compiling}>
          ▶ Executar
        </button>
      )}
      {sim.runState === "running" && <button onClick={pause}>⏸ Pausar</button>}
      {sim.runState === "paused" && <button className="primary" onClick={resume}>▶ Continuar</button>}
      <button onClick={resetSim} disabled={!active}>↺ Reset</button>
      <button onClick={stopSim} disabled={!active}>⏹ Parar</button>
      <span className={`chip ${stale ? "warn" : "ok"}`} title="O binário corresponde ao código atual?">
        {stale ? "firmware desatualizado" : "firmware atualizado"}
      </span>
      {compile.status === "error" && <span className="chip error">erro de compilação</span>}
      {active && (
        <span className="sim-time" title="Tempo simulado (relógio de 16 MHz)">
          t = {(sim.timeMs / 1000).toFixed(2)} s{sim.realtimeRatio < 0.95 ? ` • ${Math.round(sim.realtimeRatio * 100)}% do tempo real` : ""}
        </span>
      )}
      {sim.error && <span className="chip error">{sim.error}</span>}
    </div>
  );
}