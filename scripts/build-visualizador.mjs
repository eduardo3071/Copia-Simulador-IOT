// Builds the interactive 3D viewer from the STLs in pacote-montagem/mecanica.
//   pacote-montagem/visualizador-3d.html : complete page, opens in any browser (needs internet for three.js)
//   <outDir>/visualizador-fragmento.html : same page without the document skeleton, for publishing as an Artifact
// Run: node scripts/build-visualizador.mjs [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../pacote-montagem/", import.meta.url);
const b64 = (path) => readFileSync(new URL(`mecanica/${path}`, root)).toString("base64");
const data = {
  body1: b64("v1-pilha/suporte-base-coluna.stl"),
  lid1: b64("v1-pilha/tampa-fundo.stl"),
  body2: b64("v2-fonte/suporte-base-coluna.stl"),
  lid2: b64("v2-fonte/tampa-fundo.stl"),
  clamp: b64("comum/abracadeira-tubo.stl"),
  diffuser: b64("comum/difusor.stl"),
};
// pregoscopio parts converted from Pregoscopio V1.step (scripts/step-para-stl.py)
for (let i = 1; i <= 9; i++) {
  data["pre" + i] = readFileSync(new URL(`../apps/web/public/suporte/pregoscopio/pregoscopio-${i}.stl`, import.meta.url)).toString("base64");
}
const template = readFileSync(new URL("./visualizador-template.html", import.meta.url), "utf8");
const fragment = template.replace("/*STL_DATA*/{}", JSON.stringify(data));
const full = `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<style>:root{color-scheme:light}body{margin:0}</style>\n</head>\n<body>\n${fragment}\n</body>\n</html>\n`;
writeFileSync(new URL("visualizador-3d.html", root), full);
const outDir = process.argv[2];
if (outDir) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/visualizador-fragmento.html`, fragment);
}
console.log(`ok: ${(full.length / 1e6).toFixed(2)} MB`);
