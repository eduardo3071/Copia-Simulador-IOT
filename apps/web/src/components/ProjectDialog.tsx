import { useEffect, useState } from "react";
import { api, type ProjectSummary } from "../api.ts";
import { useApp } from "../store.ts";

const FIXTURE_LABELS: Record<string, string> = {
  blink: "Blink — Arduino + LED + resistor na protoboard",
  "button-led": "Botão + LED — entrada com pull-up interno",
  "pot-adc": "Potenciômetro + ADC — leitura analógica no serial",
  "sensores-lcd": "DHT22 + LCD 16x2 — temperatura e umidade no display",
  "ultrassom-servo": "HC-SR04 + servo + buzzer — radar de distância",
  "luz-rgb": "Sensor de luz + LED RGB + potenciômetro deslizante",
  "contador-7seg": "Contador no display de 7 segmentos e barra de LEDs",
};

export function ProjectDialog({ onClose }: { onClose?: () => void }) {
  const open = useApp((s) => s.open);
  const notify = useApp((s) => s.notify);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [fixtures, setFixtures] = useState<string[]>([]);
  const [toolchain, setToolchain] = useState<string>("");
  const [title, setTitle] = useState("Meu projeto");

  useEffect(() => {
    void api.listProjects().then(setProjects).catch(() => setProjects([]));
    void api.listFixtures().then(setFixtures).catch(() => setFixtures([]));
    void api
      .health()
      .then((h) => setToolchain(h.toolchain.available ? `arduino-cli ${h.toolchain.arduinoCli} • ${Object.entries(h.toolchain.cores).map(([k, v]) => `${k}@${v}`).join(", ")}` : "arduino-cli não instalado (rode npm run setup:arduino); apenas exemplos pré-compilados executam"))
      .catch(() => setToolchain("API indisponível"));
  }, []);

  const go = async (body: Parameters<typeof api.createProject>[0]) => {
    try {
      open(await api.createProject(body));
      onClose?.();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Projetos">
        <h2>Projetos</h2>
        <section>
          <h3>Novo</h3>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              void go({ title });
            }}
          >
            <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título do novo projeto" />
            <button type="submit">Criar projeto vazio</button>
          </form>
        </section>
        <section>
          <h3>Suporte do Pregoscópio</h3>
          <p className="small"><a href="#suporte">Abrir o 3D, a lista de peças com identificadores, a eletrônica e os gabaritos de calibração</a></p>
          <h3>Exemplos de referência</h3>
          {fixtures.map((name) => (
            <button key={name} className="list-item" onClick={() => void go({ fixture: name })}>
              {FIXTURE_LABELS[name] ?? name}
            </button>
          ))}
        </section>
        <section>
          <h3>Abrir</h3>
          {projects.length === 0 && <p className="muted">Nenhum projeto salvo ainda.</p>}
          {projects.map((p) => (
            <button
              key={p.id}
              className="list-item"
              onClick={async () => {
                open(await api.getProject(p.id));
                onClose?.();
              }}
            >
              <span>{p.title}</span>
              <small>
                rev. {p.revision} • {new Date(p.updatedAt).toLocaleString("pt-BR")}
              </small>
            </button>
          ))}
        </section>
        <p className="muted small">{toolchain}</p>
      </div>
    </div>
  );
}