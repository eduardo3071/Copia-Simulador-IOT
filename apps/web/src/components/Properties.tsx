import { useEffect, useState } from "react";
import { getDefinition, pinIdsOf, type ComponentDefinition, type EnvDef, type ParamDef } from "@simiot/component-catalog";
import { checkReferences, type ComponentInstance } from "@simiot/project-model";
import { rotatePart, terminalLabel } from "../lib/editing.ts";
import { sim, useApp, useProject } from "../store.ts";

/** Slider for a simulated quantity (log scale for illuminance). */
function EnvSlider({ componentId, env }: { componentId: string; env: EnvDef }) {
  useApp((s) => s.sim.env); // re-render when any value changes
  const value = sim.envValue(componentId, env.key) ?? env.default;
  const toSlider = (v: number) => (env.log ? Math.log10(v) : v);
  const fromSlider = (s: number) => (env.log ? Number(Math.pow(10, s).toPrecision(3)) : s);
  return (
    <label className="field env-field">
      <span>
        {env.label}: <strong>{value}</strong> {env.unit}
      </span>
      <input
        type="range"
        min={toSlider(env.min)}
        max={toSlider(env.max)}
        step={env.log ? 0.01 : env.step}
        value={toSlider(value)}
        onChange={(e) => sim.setEnv(componentId, env.key, fromSlider(Number(e.target.value)))}
      />
    </label>
  );
}

/** Live readings and environment controls while the simulation runs. */
function SimSection({ component, def }: { component: ComponentInstance; def: ComponentDefinition }) {
  const state = useApp((s) => s.sim);
  const running = state.runState === "running" || state.runState === "paused";
  const lab = state.lab;
  const readings: string[] = [];
  const buzzer = lab?.buzzers[component.id];
  if (buzzer) readings.push(buzzer.active ? `Tocando${buzzer.frequencyHz ? ` ${buzzer.frequencyHz} Hz` : " (contínuo)"}` : "Em silêncio");
  const servo = lab?.servos[component.id];
  if (servo) readings.push(!servo.powered ? "Sem alimentação" : servo.angle !== undefined ? `Ângulo: ${servo.angle}°` : "Sem sinal PWM");
  const ldr = lab?.ldrModules[component.id];
  if (ldr) readings.push(ldr.powered ? `AO = ${ldr.ao.toFixed(2)} V • DO = ${ldr.do ? "alto (escuro)" : "baixo (claro)"}` : "Sem alimentação");
  if (lab && component.id in lab.devicePower) readings.push(lab.devicePower[component.id] ? "Alimentado e emulado" : "Sem alimentação: não responde");
  const env = def.simulation.env ?? [];
  if (!def.simulation.note && !env.length && !readings.length) return null;
  return (
    <section className="sim-section">
      <h4>Simulação</h4>
      {def.simulation.note && <p className="muted small">{def.simulation.note}</p>}
      {running && readings.map((r) => <p key={r} className="reading">{r}</p>)}
      {env.length > 0 && (running ? env.map((e) => <EnvSlider key={e.key} componentId={component.id} env={e} />) : <p className="muted small">Execute a simulação para ajustar {env.map((e) => e.label.toLowerCase()).join(" e ")}.</p>)}
    </section>
  );
}

function NumberField({ param, value, onCommit }: { param: ParamDef; value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n) && (param.min === undefined || n >= param.min) && (param.max === undefined || n <= param.max)) onCommit(n);
    else setText(String(value));
  };
  return (
    <input
      type="number"
      value={text}
      min={param.min}
      max={param.max}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

function ComponentProps({ component }: { component: ComponentInstance }) {
  const project = useProject()!;
  const { dispatch, select } = useApp.getState();
  const def = getDefinition(component.definitionId);
  if (!def) return <p>Definição desconhecida: {component.definitionId}</p>;
  const pinsUsed = project.connections.filter((c) => c.a.componentId === component.id || c.b.componentId === component.id);
  return (
    <>
      <h3>
        {component.refDes} <small>{def.name}</small>
      </h3>
      <dl className="caps-list">
        <dt>Simulável</dt>
        <dd>{def.capabilities.simulable ? "sim (lógico)" : "não"}</dd>
        <dt>Fabricável</dt>
        <dd>{def.capabilities.fabricable ? "sim" : "não"}</dd>
        <dt>Origem</dt>
        <dd title={def.provenance.footprint}>{def.provenance.visual}</dd>
      </dl>
      {def.params.map((param) => (
        <label key={param.key} className="field">
          <span>
            {param.label}
            {param.unit ? ` (${param.unit})` : ""}
          </span>
          {param.type === "select" ? (
            <select
              value={String(component.params[param.key] ?? param.default)}
              onChange={(e) => dispatch({ type: "setParam", componentId: component.id, key: param.key, value: e.target.value })}
            >
              {param.options!.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <NumberField
              param={param}
              value={Number(component.params[param.key] ?? param.default)}
              onCommit={(value) => dispatch({ type: "setParam", componentId: component.id, key: param.key, value })}
            />
          )}
        </label>
      ))}
      {def.eda.footprints.length > 1 && (
        <label className="field">
          <span>Footprint</span>
          <select
            value={component.footprint ?? def.eda.footprints[0]}
            onChange={(e) =>
              dispatch({ type: "setFootprint", componentId: component.id, footprint: e.target.value === def.eda.footprints[0] ? undefined : e.target.value })
            }
          >
            {def.eda.footprints.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      )}
      <div className="row">
        {def.visual.kind !== "breadboard" && (
          <button onClick={() => {
            const command = rotatePart(project, component.id);
            if (command) dispatch(command);
          }}>Girar 90°</button>
        )}
        <button className="danger" onClick={() => {
          dispatch({ type: "removeComponent", componentId: component.id });
          select(null);
        }}>Remover</button>
      </div>
      <SimSection component={component} def={def} />
      <h4>Ligações ({pinsUsed.length})</h4>
      <ul className="conn-list">
        {pinsUsed.slice(0, 30).map((c) => (
          <li key={c.id}>
            {terminalLabel(project, c.a)} ↔ {terminalLabel(project, c.b)} <small>{c.kind === "contact" ? "encaixe" : "fio"}</small>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Properties() {
  const project = useProject()!;
  const selection = useApp((s) => s.selection);
  const lab = useApp((s) => s.sim.lab);
  const running = useApp((s) => s.sim.runState === "running" || s.sim.runState === "paused");
  const { dispatch, select } = useApp.getState();
  const issues = checkReferences(project, pinIdsOf);

  let body;
  if (selection?.kind === "component") {
    const component = project.components.find((c) => c.id === selection.id);
    body = component ? <ComponentProps component={component} /> : null;
  } else if (selection?.kind === "connection") {
    const conn = project.connections.find((c) => c.id === selection.id);
    body = conn ? (
      <>
        <h3>{conn.kind === "wire" ? "Fio" : "Encaixe na protoboard"}</h3>
        <p>
          {terminalLabel(project, conn.a)} ↔ {terminalLabel(project, conn.b)}
        </p>
        {conn.kind === "wire" && (
          <label className="field">
            <span>Cor</span>
            <select
              value={project.breadboard.wires[conn.id]?.color ?? "green"}
              onChange={(e) => dispatch({ type: "setWireColor", connectionId: conn.id, color: e.target.value })}
            >
              {["green", "orange", "blue", "yellow", "purple", "white", "red", "black"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        <button className="danger" onClick={() => {
          dispatch({ type: "disconnect", connectionId: conn.id });
          select(null);
        }}>Remover ligação</button>
      </>
    ) : null;
  } else {
    body = (
      <>
        <h3>Projeto</h3>
        <p>
          {project.components.length} componentes • {project.connections.length} ligações
        </p>
        <p className="muted">Selecione uma peça ou fio para editar.</p>
      </>
    );
  }

  return (
    <aside className="properties">
      {body}
      {running && lab && (
        <section className="lab-panel">
          <h4>Laboratório</h4>
          <p className="muted">Avaliação lógica/resistiva simplificada (LED ideal, sem SPICE).</p>
          <ul>
            {Object.entries(lab.netVoltage)
              .slice(0, 12)
              .map(([net, v]) => (
                <li key={net}>
                  {net}: {v.toFixed(2)} V
                </li>
              ))}
          </ul>
          {Object.entries(lab.leds)
            .filter(([, led]) => led.currentMa !== undefined)
            .map(([id, led]) => (
              <p key={id} className="small">
                Corrente do LED {project.components.find((c) => c.id === id)?.refDes ?? id}: <b>{led.currentMa!.toFixed(1)} mA</b>
              </p>
            ))}
          {lab.issues.map((i) => (
            <p key={i} className="issue">{i}</p>
          ))}
        </section>
      )}
      {issues.length > 0 && (
        <section className="issues">
          <h4>Verificações</h4>
          {issues.map((i) => (
            <p key={i.message} className="issue">{i.message}</p>
          ))}
        </section>
      )}
    </aside>
  );
}