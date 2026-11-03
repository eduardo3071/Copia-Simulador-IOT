// Runs the collision check of the technical drawings in headless Edge and prints the problems.
// Needs the site built and served (npm run build -w @simiot/web; npx vite preview --port 4173 in apps/web).
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.MANUAL_URL ?? "http://localhost:4173/";
mkdirSync(resolve("shots"), { recursive: true });
let total = 0;
for (const v of ["v1", "v2"]) {
  const profile = resolve("shots", `edge-check-${v}`).replaceAll("\\", "/");
  const run = spawnSync(EDGE, ["--headless=new", `--user-data-dir=${profile}`, "--dump-dom", "--virtual-time-budget=20000", `${BASE}#suporte/manual/${v}/1/check`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const m = /<pre id="dt-check"[^>]*>([^<]*)<\/pre>/.exec(run.stdout ?? "");
  if (!m) { console.log(v, "sem resultado"); total += 1; continue; }
  const data = JSON.parse(m[1]!.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">")) as { problems: string[] };
  console.log(`${v}: ${data.problems.length} problema(s)`);
  for (const p of data.problems) console.log("  ", p);
  total += data.problems.length;
}
process.exit(total ? 1 : 0);
