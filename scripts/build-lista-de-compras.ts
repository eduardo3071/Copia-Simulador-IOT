// Writes the shopping lists of both versions (CSV, semicolon-separated) from the part catalog.
import { mkdirSync, writeFileSync } from "node:fs";
import { bomCsv } from "../packages/adapter-cad/src/index.ts";

const out = new URL("../pacote-montagem/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const version of ["v1", "v2"] as const) {
  writeFileSync(new URL(`lista-de-compras-${version}.csv`, out), bomCsv(version));
  console.log(`lista-de-compras-${version}.csv`);
}
