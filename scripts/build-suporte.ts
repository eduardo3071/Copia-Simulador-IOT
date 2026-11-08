// Writes the STLs of the pregoscopio holder (light box + C column + clamp) to pacote-montagem/mecanica/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import opencascade from "replicad-opencascadejs";
import { setOC, type Shape3D } from "replicad";
import { stlOf } from "../packages/adapter-cad/src/geometry.ts";
import { apertureWheelOnBed, buildHolder, holderOnBack } from "../packages/adapter-cad/src/holder-geometry.ts";
import { DEFAULT_HOLDER_PARAMS, holderLayout, layoutEconomica1000x, withStlHeader } from "../packages/adapter-cad/src/index.ts";

const require = createRequire(import.meta.url);
setOC(await opencascade({ wasmBinary: readFileSync(require.resolve("replicad-opencascadejs/wasm")) }));

const out = new URL("../pacote-montagem/mecanica/", import.meta.url);
mkdirSync(out, { recursive: true });
const write = async (name: string, shape: Shape3D) => {
  const file = new URL(name, out);
  mkdirSync(new URL("./", file), { recursive: true });
  writeFileSync(file, Buffer.from(withStlHeader(await stlOf(shape), `Suporte pregoscopio ${name}`)));
  console.log(`escrito ${name}`);
};

// Clamp and diffuser are the same in both versions; body and lid change with the variant.
const common = buildHolder(holderLayout());
await write("comum/abracadeira-tubo.stl", common.clamp);
await write("comum/abracadeira-tubo-impressao.stl", holderOnBack(common.clamp));
await write("comum/difusor.stl", common.diffuser);

for (const variant of ["pilha", "fonte"] as const) {
  const layout = holderLayout({ ...DEFAULT_HOLDER_PARAMS, variant });
  for (const issue of layout.issues) console.warn(`${variant} ${issue.severity}: ${issue.message}`);
  const shapes = buildHolder(layout);
  const tag = variant === "pilha" ? "v1-pilha" : "v2-fonte";
  await write(`${tag}/suporte-base-coluna.stl`, shapes.body);
  await write(`${tag}/suporte-base-coluna-impressao.stl`, holderOnBack(shapes.body));
  await write(`${tag}/tampa-fundo.stl`, shapes.lid);
  console.log(`${tag}: altura total ${layout.totalHeight} mm`);
}

// Economical 1000x version (100x oil objective, 3 W LED under an iris): its own body, lid, clamp (the ring sits higher) and light tube.
{
  const layout = layoutEconomica1000x();
  for (const issue of layout.issues) console.warn(`1000x ${issue.severity}: ${issue.message}`);
  const shapes = buildHolder(layout);
  const tag = "v2-1000x";
  await write(`${tag}/suporte-base-coluna.stl`, shapes.body);
  await write(`${tag}/suporte-base-coluna-impressao.stl`, holderOnBack(shapes.body));
  await write(`${tag}/tampa-fundo.stl`, shapes.lid);
  await write(`${tag}/abracadeira-tubo.stl`, shapes.clamp);
  await write(`${tag}/abracadeira-tubo-impressao.stl`, holderOnBack(shapes.clamp));
  if (shapes.lightTube) await write(`${tag}/tubo-de-luz.stl`, shapes.lightTube);
  if (shapes.wheel) await write(`${tag}/roda-de-aberturas.stl`, shapes.wheel);
  const flat = apertureWheelOnBed(layout);
  if (flat) await write(`${tag}/roda-de-aberturas-impressao.stl`, flat);
  console.log(`${tag}: altura total ${layout.totalHeight} mm`);
}
