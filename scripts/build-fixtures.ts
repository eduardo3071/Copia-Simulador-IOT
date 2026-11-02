// Regenerates fixtures/<name>/{project.json,firmware.hex}. Requires `npm run setup:arduino`.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkReferences, firmwareInputsKey } from "@simiot/project-model";
import { pinIdsOf } from "@simiot/component-catalog";
import { Compiler, REPO_ROOT } from "@simiot/compiler";
import { FIXTURES } from "./fixture-projects.ts";

const compiler = new Compiler();
for (const fixture of FIXTURES) {
  const dir = join(REPO_ROOT, "fixtures", fixture.name);
  const sketch = readFileSync(join(dir, "sketch.ino"), "utf8");
  const project = fixture.build(sketch);
  const issues = checkReferences(project, pinIdsOf);
  if (issues.length) throw new Error(`${fixture.name}: ${issues.map((i) => i.message).join("; ")}`);
  const result = await compiler.compile(project.firmware);
  if (!result.ok) throw new Error(`${fixture.name}: falha ao compilar\n${result.log}`);
  writeFileSync(join(dir, "firmware.hex"), result.hex);
  const withArtifact = {
    ...project,
    artifacts: { firmware: { hash: result.cacheKey, inputsKey: firmwareInputsKey(project), sourceRevision: project.revision, createdAt: project.updatedAt } },
  };
  writeFileSync(join(dir, "project.json"), `${JSON.stringify(withArtifact, null, 2)}\n`);
  console.log(`${fixture.name}: ${project.components.length} componentes, ${project.connections.length} conexões, hex ${result.hex.length} bytes${result.cached ? " (cache)" : ""}`);
}