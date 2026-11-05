import { describe, expect, it } from "vitest";
import {
  GLOSSARY, HINT_TEXT, QA, SAFETY, STATUS, TEST_TEXT, TOOLS, PRINT, manualFiles, manualSteps, masterPlan, netList, wiringOrder,
  type Bilingual,
} from "../src/index.ts";

/** The same technical word must be translated the same way everywhere. */
const TERMS: [RegExp, RegExp, RegExp][] = [
  [/ânodo/i, /阳极/, /anode/i],
  [/cátodo/i, /阴极/, /cathode/i],
  [/termorretrátil/i, /热缩管/, /heat-shrink/i],
  [/multímetro/i, /万用表/, /multimeter/i],
  [/reostato/i, /电位器/, /rheostat/i],
  [/interruptor/i, /开关/, /switch/i],
  [/difusor/i, /扩散片/, /diffuser/i],
  [/lâmina/i, /载玻片/, /slide/i],
  [/abraçadeira/i, /抱箍/, /clamp/i],
  [/objetiva/i, /物镜/, /objective/i],
  [/gabarito/i, /校准件/, /jig/i],
  [/conector/i, /插座/, /jack/i],
  [/pilha/i, /电池/, /batter/i],
];

function everyText(): { where: string; t: Bilingual }[] {
  const out: { where: string; t: Bilingual }[] = [];
  const add = (where: string, list: Bilingual[]) => list.forEach((t, i) => out.push({ where: `${where} ${i + 1}`, t }));
  for (const v of ["v1", "v2"] as const) {
    for (const s of manualSteps(v)) {
      add(`${v} passo ${s.n}`, [s.title, s.text, ...(s.check ? [s.check] : []), ...(s.warn ? [s.warn] : [])]);
    }
    add(`${v} ligações`, [...wiringOrder(v), ...netList(v)]);
    add(`${v} fixação`, masterPlan(v).map((p) => p.mount));
    add(`${v} arquivos`, manualFiles(v).map((f) => f.text));
  }
  add("status", STATUS);
  add("segurança", SAFETY);
  add("inspeção", QA);
  add("ferramentas", TOOLS);
  add("impressão", PRINT.map((p) => p.text));
  add("teste", Object.values(TEST_TEXT));
  add("dicas do teste", Object.values(HINT_TEXT));
  return out;
}

describe("tradução", () => {
  it("a mesma palavra técnica é traduzida do mesmo jeito em todo o manual", () => {
    const problems: string[] = [];
    for (const { where, t } of everyText()) {
      for (const [pt, zh, en] of TERMS) {
        if (!pt.test(t.pt)) continue;
        if (!zh.test(t.zh)) problems.push(`${where}: "${pt.source}" sem ${zh.source} no chinês`);
        if (!en.test(t.en)) problems.push(`${where}: "${pt.source}" sem ${en.source} no inglês`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("os números aparecem iguais nos três idiomas (mesmas medidas, sem erro de digitação)", () => {
    const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".")).sort();
    const problems: string[] = [];
    for (const { where, t } of everyText()) {
      const a = nums(t.pt).join(" ");
      if (a !== nums(t.zh).join(" ")) problems.push(`${where}: números do chinês diferem (${nums(t.pt).join(",")} x ${nums(t.zh).join(",")})`);
      if (a !== nums(t.en).join(" ")) problems.push(`${where}: números do inglês diferem (${nums(t.pt).join(",")} x ${nums(t.en).join(",")})`);
    }
    expect(problems).toEqual([]);
  });

  it("o glossário tem os três idiomas e nenhum termo repetido", () => {
    const pts = GLOSSARY.map((g) => g.pt);
    expect(new Set(pts).size).toBe(pts.length);
    for (const g of GLOSSARY) {
      expect(g.zh.length).toBeGreaterThan(0);
      expect(g.en.length).toBeGreaterThan(0);
    }
  });
});
