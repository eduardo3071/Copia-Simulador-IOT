// Light circuit of the pregoscopio base: Uno 5 V -> 220 ohm -> LED -> GND, with its PCB and fabrication files.
// Writes fabricacao/suporte-luz/circuito-luz.project.json and fabricacao/circuito-luz-fabricacao/.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCommand, checkReferences } from "@simiot/project-model";
import { pinIdsOf } from "@simiot/component-catalog";
import { fabricationFiles, projectToCircuitJson } from "@simiot/adapter-eda";
import { blinkProject } from "./fixture-projects.ts";

const root = new URL("../fabricacao/", import.meta.url);
const sketch = `// Luz fixa: o LED é alimentado direto pelo pino 5V, sem firmware.\nvoid setup() {}\nvoid loop() {}\n`;

let project = blinkProject(sketch);
project = applyCommand(project, { type: "disconnect", connectionId: "conn_w_d13" });
project = applyCommand(project, { type: "connect", connection: { id: "conn_w_5v", kind: "wire", a: { componentId: "cmp_uno", pinId: "5V" }, b: { componentId: "cmp_bb", pinId: "10a" } }, color: "red" });
project = { ...project, title: "Luz do pregoscopio" };

const issues = checkReferences(project, pinIdsOf);
if (issues.length) throw new Error(issues.map((i) => i.message).join("; "));

mkdirSync(new URL("suporte-luz/", root), { recursive: true });
writeFileSync(new URL("suporte-luz/circuito-luz.project.json", root), `${JSON.stringify(project, null, 2)}\n`);

const eda = await projectToCircuitJson(project);
console.log("notas:", eda.notes);
const files = await fabricationFiles(eda.circuitJson, { title: project.title, revision: project.revision });
for (const f of files) {
  const url = new URL(`circuito-luz-fabricacao/${f.path}`, root);
  mkdirSync(dirname(fileURLToPath(url)), { recursive: true });
  writeFileSync(url, f.content);
}
console.log(files.map((f) => f.path).join("\n"));
