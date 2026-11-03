// Copies the support package (STLs, jigs, schematics) into apps/web/public/suporte so the site serves them.
// Run after build-suporte, build-calibracao and build-eletronica: node scripts/publicar-suporte.mjs
import { cpSync, mkdirSync, rmSync } from "node:fs";

const from = new URL("../pacote-montagem/", import.meta.url);
const to = new URL("../apps/web/public/suporte/", import.meta.url);
for (const dir of ["mecanica", "eletronica"]) rmSync(new URL(`${dir}/`, to), { recursive: true, force: true });
mkdirSync(to, { recursive: true });
cpSync(new URL("mecanica/", from), new URL("mecanica/", to), { recursive: true, filter: (src) => !src.endsWith(".png") });
for (const [source, target] of [
  ["eletronica/v1-pilha/esquematico.svg", "eletronica/v1-esquematico.svg"],
  ["eletronica/v2-fonte-dimmer/esquematico.svg", "eletronica/v2-esquematico.svg"],
]) {
  mkdirSync(new URL("eletronica/", to), { recursive: true });
  cpSync(new URL(source, from), new URL(target, to));
}
rmSync(new URL("manual/", to), { recursive: true, force: true });
cpSync(new URL("manual/", from), new URL("manual/", to), { recursive: true });
for (const v of ["v1", "v2"]) {
  try {
    cpSync(new URL(`MANUAL-${v}.pdf`, from), new URL(`MANUAL-${v}.pdf`, to));
  } catch {
    console.log(`MANUAL-${v}.pdf ainda não foi gerado (npx tsx scripts/render-manual.ts --pdf)`);
  }
}
console.log("publicado em apps/web/public/suporte");
