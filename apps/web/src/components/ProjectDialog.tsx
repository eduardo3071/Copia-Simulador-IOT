import { useEffect, useMemo, useState } from "react";
import { api, type ProjectSummary } from "../api.ts";
import { useApp } from "../store.ts";

const FIXTURE_LABELS: Record<string, string> = {
  "suporte-v1": "v1 — pilha 9 V, interruptor, resistor e LED (sem programação)",
  "suporte-v2": "v2 — fonte 12 V, LM317 e reostato de brilho (sem programação)",
  blink: "1. Blink — Arduino + LED + resistor na protoboard",
  "button-led": "2. Botão + LED — entrada com pull-up interno",
  "pot-adc": "3. Potenciômetro + ADC — leitura analógica no serial",
  "luz-rgb": "4. Sensor de luz + LED RGB + potenciômetro deslizante",
  "contador-7seg": "5. Contador no display de 7 segmentos e barra de LEDs",
  "sensores-lcd": "6. DHT22 + LCD 16x2 — temperatura e umidade no display",
  "ultrassom-servo": "7. HC-SR04 + servo + buzzer — radar de distância",
};

const GROUPS: { title: string; names: string[] }[] = [
  { title: "Suporte do Pregoscópio (circuito da luz)", names: ["suporte-v1", "suporte-v2"] },
  { title: "Aprender com Arduino (do mais simples ao mais completo)", names: ["blink", "button-led", "pot-adc", "luz-rgb", "contador-7seg", "sensores-lcd", "ultrassom-servo"] },
];

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

  // each click on an example saves a new copy; show one line per title, the most recent
  const saved = useMemo(() => {
    const byTitle = new Map<string, { project: ProjectSummary; copies: number }>();
    for (const p of [...projects].sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))) {
      const seen = byTitle.get(p.title);
      if (seen) seen.copies += 1;
      else byTitle.set(p.title, { project: p, copies: 1 });
    }
    return [...byTitle.values()];
  }, [projects]);

  const go = async (body: Parameters<typeof api.createProject>[0]) => {
    try {
      open(await api.createProject(body));
      onClose?.();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const example = (name: string) =>
    fixtures.includes(name) && (
      <button key={name} className="list-item" onClick={() => void go({ fixture: name })}>
        {FIXTURE_LABELS[name] ?? name}
      </button>
    );
  const arduino = GROUPS[1]!.names.filter((n) => fixtures.includes(n));

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Projetos">
        <h2>Projetos</h2>
        <section>
          <h3>Vai construir o suporte do Pregoscópio?</h3>
          <p className="small">Comece pelo manual: planta com todas as peças, lista de compras, montagem passo a passo e PDF para o fabricante (português e chinês).</p>
          <div className="row">
            <a className="list-item" href="#suporte/manual/v1" onClick={onClose}>Manual da versão 1 — pilha de 9 V</a>
            <a className="list-item" href="#suporte/manual/v2" onClick={onClose}>Manual da versão 2 — fonte 12 V e dimmer</a>
          </div>
          <p className="small"><a href="#suporte/3d/v1" onClick={onClose}>Ver o 3D e as peças</a> · <a href="#suporte/eletronica/v1" onClick={onClose}>Eletrônica e teste com o multímetro</a> · <a href="#suporte/calibracao/v1" onClick={onClose}>Gabaritos de calibração</a></p>
        </section>
        <section>
          <h3>Simular o circuito da luz</h3>
          <p className="small">Abre o circuito do suporte no simulador: ligue o interruptor, gire o reostato e veja a corrente do LED.</p>
          {example("suporte-v1")}
          {example("suporte-v2")}
        </section>
        {arduino.length > 0 && (
          <details>
            <summary>Aprender Arduino (exemplos do mais simples ao mais completo)</summary>
            {arduino.map(example)}
          </details>
        )}
        <details>
          <summary>Criar um projeto vazio</summary>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              void go({ title });
            }}
          >
            <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título do novo projeto" />
            <button type="submit">Criar</button>
          </form>
        </details>
        <details>
          <summary>Avançado: meus projetos salvos ({saved.length})</summary>
          <p className="small muted">
            Para quem já mexeu num exemplo e salvou. Cada projeto salvo é uma cópia sua, independente do modelo original, e serve para retomar o trabalho de onde parou. Não é um histórico de versões e não é necessário para construir o suporte.
          </p>
          {saved.length === 0 && <p className="muted small">Nenhum projeto salvo ainda.</p>}
          {saved.map(({ project: p, copies }) => (
            <button
              key={p.id}
              className="list-item"
              onClick={async () => {
                open(await api.getProject(p.id));
                onClose?.();
              }}
            >
              <span>{p.title}{copies > 1 && <small> · {copies} cópias salvas, mostrando a mais recente</small>}</span>
              <small>
                rev. {p.revision} • {new Date(p.updatedAt).toLocaleString("pt-BR")}
              </small>
            </button>
          ))}
        </details>
        <p className="muted small">{toolchain}</p>
      </div>
    </div>
  );
}
