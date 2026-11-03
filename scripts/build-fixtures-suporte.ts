// Writes fixtures/suporte-v1 and fixtures/suporte-v2 (circuits without firmware, so no compiler is needed).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkReferences } from "@simiot/project-model";
import { pinIdsOf } from "@simiot/component-catalog";
import { REPO_ROOT } from "@simiot/compiler";
import { FIXTURES_ELETRICOS } from "./fixture-projects.ts";

for (const fixture of FIXTURES_ELETRICOS) {
  const project = fixture.build();
  const issues = checkReferences(project, pinIdsOf);
  if (issues.length) throw new Error(`${fixture.name}: ${issues.map((i) => i.message).join("; ")}`);
  const dir = join(REPO_ROOT, "fixtures", fixture.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "project.json"), `${JSON.stringify(project, null, 2)}
`);
  console.log(`${fixture.name}: ${project.components.length} componentes, ${project.connections.length} conexões`);
}
