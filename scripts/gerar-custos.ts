// Writes the cost sheets (1 prototype and a batch of 100, for each version) to pacote-montagem/.
// Run: npx tsx scripts/gerar-custos.ts
import { writeFileSync } from "node:fs";
import { costCsv } from "../packages/adapter-cad/src/index.ts";

for (const v of ["v1", "v2"] as const) {
  for (const n of [1, 100]) {
    const name = `CUSTOS-${v}-${n}un.csv`;
    writeFileSync(new URL(`../pacote-montagem/${name}`, import.meta.url), costCsv(v, n));
    console.log("escrito", name);
  }
}
