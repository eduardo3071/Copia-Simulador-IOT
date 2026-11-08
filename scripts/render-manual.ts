// Renders the step pictures of the construction manual and, with --pdf, the PDF of each version.
// Needs the site built and served: npm run build -w @simiot/web && npx vite preview --port 4173 (in apps/web).
//   npx tsx scripts/render-manual.ts            -> pacote-montagem/manual/v?-passo-NN.png
//   npx tsx scripts/render-manual.ts --pdf      -> pacote-montagem/MANUAL-v?[-pt|-zh|-en].pdf (rebuild the site after the pictures)
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { manualSteps, partsUpToStep, partsUpToStep1000x, steps1000x } from "@simiot/adapter-cad";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.MANUAL_URL ?? "http://127.0.0.1:4173/";
const fwd = (p: string) => p.replaceAll("\\", "/");
const out = resolve("pacote-montagem", "manual");
mkdirSync(out, { recursive: true });

function edge(args: string[], slot: number): Promise<void> {
  return new Promise((done, fail) => {
    // MANUAL_SLOT shifts the profile folders, so a run can start while an Edge from an earlier run is still holding its own
    const profile = resolve("shots", `edge-${slot + Number(process.env.MANUAL_SLOT ?? 0)}`);
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
  const jobs = (["v1", "v2", "v2-1000x"] as const).flatMap((v) => (["bi", "pt", "zh", "en"] as const).map((lang) => ({ v, lang })));
  // MANUAL_ONLY="v1:bi,v1:pt" renders only those editions (a hung Edge can be redone without the others)
  const only = process.env.MANUAL_ONLY?.split(",");
  const wanted = only ? jobs.filter((j) => only.includes(`${j.v}:${j.lang}`)) : jobs;
  await pool(wanted, 2, async ({ v, lang }, slot) => {
    const file = resolve("pacote-montagem", `MANUAL-${v}${lang === "bi" ? "" : `-${lang}`}.pdf`);
    await edge([`--print-to-pdf=${fwd(file)}`, "--no-pdf-header-footer", "--virtual-time-budget=30000", `${BASE}#suporte/manual/${v}/1/doc/${lang}`], slot);
    console.log("pdf", file);
  });
} else {
  // the steps with the whole pregoscope are tall: they get a portrait picture
  const jobs = [
    ...(["v1", "v2"] as const).flatMap((v) => [
      { v: v as string, n: 0, name: `${v}-visao-geral.png`, size: "1300,800" },
      ...manualSteps(v).map((s) => ({ v: v as string, n: s.n, name: `${v}-passo-${String(s.n).padStart(2, "0")}.png`, size: partsUpToStep(v, s.n).has("P1") ? "900,1100" : "1300,800" })),
    ]),
    { v: "v2-1000x", n: 0, name: "v2-1000x-visao-geral.png", size: "1300,800" },
    ...steps1000x().map((s) => ({ v: "v2-1000x", n: s.n, name: `v2-1000x-passo-${String(s.n).padStart(2, "0")}.png`, size: partsUpToStep1000x(s.n).has("P1") ? "900,1100" : "1300,800" })),
  ];
  await pool(jobs, 2, async ({ v, n, name, size }, slot) => {
    const file = resolve(out, name);
    if (existsSync(file)) return;
    await edge([`--screenshot=${fwd(file)}`, `--window-size=${size}`, "--virtual-time-budget=40000", `${BASE}#suporte/manual/${v}/${n}/shot`], slot);
    console.log("png", file);
  });
}
