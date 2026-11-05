// Writes, for each board, the net every pad must be on (from the simulator project of the same circuit).
// scripts/verificar-rede-gerber.py compares it with the copper of the Gerber files.
// Run: npx tsx scripts/gerar-netlist-esperada.ts
import { readFileSync, writeFileSync } from "node:fs";
import { PAD_PIN } from "../packages/adapter-cad/src/index.ts";

interface Project {
  components: { id: string; refDes: string }[];
  connections: { a: { componentId: string; pinId: string }; b: { componentId: string; pinId: string } }[];
}

for (const [version, dir] of [["v1", "v1-pilha"], ["v2", "v2-fonte-dimmer"]] as const) {
  const project = JSON.parse(readFileSync(new URL(`../fixtures/suporte-${version}/project.json`, import.meta.url), "utf8")) as Project;
  const ref = new Map(project.components.map((c) => [c.id, c.refDes]));
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    if (!parent.has(k)) parent.set(k, k);
    const p = parent.get(k)!;
    if (p === k) return k;
    const r = find(p);
    parent.set(k, r);
    return r;
  };
  for (const c of project.connections) parent.set(find(`${ref.get(c.a.componentId)}:${c.a.pinId}`), find(`${ref.get(c.b.componentId)}:${c.b.pinId}`));
  const names = new Map<string, string>();
  const pads: Record<string, string> = {};
  for (const [pad, pin] of Object.entries(PAD_PIN[version])) {
    const root = find(pin);
    if (!names.has(root)) names.set(root, `N${names.size + 1}`);
    pads[pad] = names.get(root)!;
  }
  const out = new URL(`../pacote-montagem/eletronica/${dir}/netlist-esperada.json`, import.meta.url);
  writeFileSync(out, JSON.stringify({ version, pads }, null, 1));
  console.log(version, Object.keys(pads).length, "pads em", names.size, "redes");
}
