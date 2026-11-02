// Writes the STLs of the pregoscopio holder (light box + C column + clamp) to fabricacao/suporte-luz/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import opencascade from "replicad-opencascadejs";
import { setOC } from "replicad";
import { stlOf } from "../packages/adapter-cad/src/geometry.ts";
import { buildHolder, holderOnBack } from "../packages/adapter-cad/src/holder-geometry.ts";
import { holderLayout, withStlHeader } from "../packages/adapter-cad/src/index.ts";

const require = createRequire(import.meta.url);
setOC(await opencascade({ wasmBinary: readFileSync(require.resolve("replicad-opencascadejs/wasm")) }));

const layout = holderLayout();
for (const issue of layout.issues) console.warn(`${issue.severity}: ${issue.message}`);

const shapes = buildHolder(layout);
const out = new URL("../fabricacao/suporte-luz/", import.meta.url);
mkdirSync(out, { recursive: true });
const files: [string, typeof shapes.body][] = [
  ["suporte-base-coluna.stl", shapes.body],
  ["abracadeira-tubo.stl", shapes.clamp],
  ["tampa-fundo.stl", shapes.lid],
  // Print orientation: lying on the back of the column, so it fits a 300 mm bed whatever its height.
  ["suporte-base-coluna-impressao.stl", holderOnBack(shapes.body)],
  ["abracadeira-tubo-impressao.stl", holderOnBack(shapes.clamp)],
];
for (const [name, shape] of files) {
  writeFileSync(new URL(name, out), Buffer.from(withStlHeader(await stlOf(shape), `Suporte pregoscopio ${name}`)));
  console.log(`escrito ${name}`);
}
console.log(`altura total ${layout.totalHeight} mm`);
