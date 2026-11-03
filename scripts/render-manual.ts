// Renders the step pictures of the construction manual and, with --pdf, the PDF of each version.
// Needs the site built and served: npm run build -w @simiot/web && npx vite preview --port 4173 (in apps/web).
//   npx tsx scripts/render-manual.ts            -> pacote-montagem/manual/v?-passo-NN.png
//   npx tsx scripts/render-manual.ts --pdf      -> pacote-montagem/MANUAL-v?.pdf (rebuild the site after the pictures)
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { manualSteps } from "@simiot/adapter-cad";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.MANUAL_URL ?? "http://localhost:4173/";
const fwd = (p: string) => p.replaceAll("\\", "/");
const out = resolve("pacote-montagem", "manual");
mkdirSync(out, { recursive: true });

function edge(args: string[], slot: number): Promise<void> {
  return new Promise((done, fail) => {
    const profile = resolve("shots", `edge-${slot}`);
    const child = spawn(EDGE, ["--headless=new", `--user-data-dir=${fwd(profile)}`, "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", ...args], { stdio: "ignore" });
    child.on("exit", (code) => { if (code) console.log("edge exit", code); done(); });
    child.on("error", fail);
  });
}

async function pool<T>(items: T[], size: number, run: (item: T, slot: number) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async (_, slot) => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await run(item, slot);
  }));
}

if (process.argv.includes("--pdf")) {
  await pool(["v1", "v2"], 2, async (v, slot) => {
    const file = resolve("pacote-montagem", `MANUAL-${v}.pdf`);
    await edge([`--print-to-pdf=${fwd(file)}`, "--no-pdf-header-footer", "--virtual-time-budget=30000", `${BASE}#suporte/manual/${v}`], slot);
    console.log("pdf", file);
  });
} else {
  const jobs = (["v1", "v2"] as const).flatMap((v) => manualSteps(v).map((s) => ({ v, n: s.n })));
  await pool(jobs, 2, async ({ v, n }, slot) => {
    const file = resolve(out, `${v}-passo-${String(n).padStart(2, "0")}.png`);
    if (existsSync(file)) return;
    await edge([`--screenshot=${fwd(file)}`, "--window-size=1300,800", "--virtual-time-budget=40000", `${BASE}#suporte/manual/${v}/${n}/shot`], slot);
    console.log("png", file);
  });
}
