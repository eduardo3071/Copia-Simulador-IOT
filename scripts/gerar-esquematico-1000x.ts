// Writes the schematic of the 1000x version to pacote-montagem/eletronica/v2-1000x/esquematico.svg
import { mkdirSync, writeFileSync } from "node:fs";
import { esquematico1000x } from "../packages/adapter-cad/src/index.ts";

const dir = new URL("../pacote-montagem/eletronica/v2-1000x/", import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL("esquematico.svg", dir), esquematico1000x());
console.log("escrito eletronica/v2-1000x/esquematico.svg");
