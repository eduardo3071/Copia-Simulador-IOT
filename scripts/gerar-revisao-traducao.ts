// Writes the sheet a native speaker uses to review the Chinese and English of the manual and the drawings:
// every text in Portuguese, Chinese and English, with empty columns for the reviewer.
// Run: npx tsx scripts/gerar-revisao-traducao.ts   ->   pacote-montagem/TRADUCAO-REVISAO.csv
import { readFileSync, writeFileSync } from "node:fs";
import {
  GLOSSARY, HINT_TEXT, PRINT, QA, SAFETY, STANDARD_SIZE, STATUS, TEST_TEXT, TOOLS, manualFiles, manualSteps, masterPlan, netList, wiringOrder,
  type Bilingual,
} from "../packages/adapter-cad/src/index.ts";
import { DICT } from "../apps/web/src/suporte/lang.tsx";
import { JIG_TEXT } from "../apps/web/src/suporte/jigs.ts";

const rows: { section: string; pt: string; zh: string; en: string }[] = [];
const seen = new Set<string>();
const add = (section: string, pt: string, zh: string, en: string) => {
  const key = `${pt}|${zh}|${en}`;
  if (!pt.trim() || seen.has(key)) return;
  seen.add(key);
  rows.push({ section, pt, zh, en });
};
const addAll = (section: string, list: Bilingual[]) => list.forEach((t) => add(section, t.pt, t.zh, t.en));

addAll("Glossário", GLOSSARY);
for (const v of ["v1", "v2"] as const) {
  for (const s of manualSteps(v)) addAll("Passos de montagem", [s.title, s.text, ...(s.check ? [s.check] : []), ...(s.warn ? [s.warn] : [])]);
  addAll("Ligações", [...wiringOrder(v), ...netList(v)]);
  addAll("Posição das peças", masterPlan(v).map((p) => p.mount));
  addAll("Arquivos", manualFiles(v).map((f) => f.text));
}
addAll("Status", STATUS);
addAll("Segurança", SAFETY);
addAll("Inspeção final", QA);
addAll("Ferramentas", TOOLS);
addAll("Impressão", PRINT.map((p) => p.text));
addAll("Medidas padrão", Object.values(STANDARD_SIZE));
addAll("Teste elétrico", Object.values(TEST_TEXT));
addAll("Teste elétrico (dicas)", Object.values(HINT_TEXT));
for (const [pt, zh, en] of DICT) add("Desenhos técnicos", pt, zh, en);
for (const [pt, t] of Object.entries(JIG_TEXT)) add("Calibração", pt, t.zh, t.en);

// the fixed phrases written inline in the manual page
const source = readFileSync(new URL("../apps/web/src/suporte/Manual.tsx", import.meta.url), "utf8");
const quoted = String.raw`"((?:[^"\\]|\\.)*)"`;
for (const m of source.matchAll(new RegExp(String.raw`\bT\(${quoted},\s*${quoted},\s*${quoted}\)`, "g"))) add("Páginas do manual", m[1]!, m[2]!, m[3]!);
for (const m of source.matchAll(/<Tx pt="([^"]*)" zh="([^"]*)" en="([^"]*)"/g)) add("Títulos e colunas", m[1]!, m[2]!, m[3]!);

const cell = (s: string) => `"${s.replaceAll('"', '""')}"`;
const lines = [["Seção", "Português (origem)", "中文", "English", "Revisado por", "Correção sugerida"].map(cell).join(";")];
for (const r of rows) lines.push([r.section, r.pt, r.zh, r.en, "", ""].map(cell).join(";"));
writeFileSync(new URL("../pacote-montagem/TRADUCAO-REVISAO.csv", import.meta.url), "\uFEFF" + lines.join("\r\n") + "\r\n");
console.log(rows.length, "textos para revisar em pacote-montagem/TRADUCAO-REVISAO.csv");
