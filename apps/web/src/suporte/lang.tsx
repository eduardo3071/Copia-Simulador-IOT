import { Children, createContext, useContext, type ReactNode, type SVGProps } from "react";
import type { Bilingual } from "@simiot/adapter-cad";

/** "bi" is the original document (Portuguese with Chinese under it); the others are single-language editions. */
export type DocLang = "bi" | "pt" | "zh" | "en";
export const LangContext = createContext<DocLang>("bi");
export const useLang = () => useContext(LangContext);

export const LANG_LABEL: Record<DocLang, string> = { bi: "Português + 中文", pt: "Português", zh: "中文", en: "English" };

const CJK = /[　-鿿＀-￯]/;

/** "Vista frontal · 正视图" -> { pt: "Vista frontal", zh: "正视图" }. */
export function splitText(s: string): { pt: string; zh: string } {
  const han = s.search(/[一-鿿]/);
  if (han < 0) return { pt: s.trim(), zh: "" };
  // a " · " before the first Chinese character separates the two languages (the Chinese side may start with Latin letters)
  const sep = s.lastIndexOf(" · ", han);
  if (sep >= 0) return { pt: s.slice(0, sep).trim(), zh: s.slice(sep + 3).trim() };
  const i = s.search(CJK);
  return { pt: s.slice(0, i).replace(/[s·]+$/, "").trim(), zh: s.slice(i).trim() };
}

/** Portuguese phrase, Chinese, English. Longest phrases are applied first, so a whole sentence wins over its words. */
export const DICT: [string, string, string][] = [
  ["Objetiva P9 (total / abaixo do tubo)", "物镜 P9（总长 / 管下露出）", "Objective P9 (total / below the tube)"],
  ["Arquivo suporte-base-coluna-impressao.stl: deitado nas costas; suportes só dentro da caixa.", "使用 suporte-base-coluna-impressao.stl：背面朝下打印；仅在盒内加支撑。", "File suporte-base-coluna-impressao.stl: lying on its back; supports only inside the box."],
  ["Impressão do M1", "M1 打印", "Printing M1"],
  ["v1 pilha 9 V", "v1 9 V 电池", "v1 9 V battery"],
  ["v2 fonte 12 V", "v2 12 V 电源", "v2 12 V supply"],
  ["Notas gerais", "通用说明", "General notes"],
  ["Título", "图名", "Title"],
  ["Código", "图号", "Code"],
  ["Peça", "零件", "Part"],
  ["Material", "材料", "Material"],
  ["Escala", "比例", "Scale"],
  ["Folha", "张", "Sheet"],
  ["Unidades", "单位", "Units"],
  ["Tolerância", "公差", "Tolerance"],
  ["Revisão", "版本", "Revision"],
  ["Versão", "版本号", "Version"],
  ["Projeto", "项目", "Project"],
  ["Projeção", "投影法", "Projection"],
  ["1º diedro", "第一角", "1st angle"],
  ["Pregoscópio — suporte com luz", "显微镜支架（带灯）", "Pregoscope: support with light"],
  ["Cotas em mm. Tolerância geral ±0,2 mm (ISO 2768-m). Folgas de encaixe conforme os gabaritos G1 a G3.", "尺寸单位 mm。未注公差 ±0.2 mm（ISO 2768-m）。配合间隙以校准件 G1~G3 为准。", "Dimensions in mm. General tolerance ±0.2 mm (ISO 2768-m). Fit clearances follow jigs G1 to G3."],
  ["PLA, camada 0,2 mm, 3 perímetros, enchimento 20 a 30 %. Orientação de impressão: ver capa.", "PLA，层高 0.2 mm，3 层外壁，填充 20~30%。打印方向见封面。", "PLA, 0.2 mm layer, 3 perimeters, 20 to 30 % infill. Print orientation: see the cover."],
  ["Cotas com (*) dependem da calibração física e podem mudar na revisão B.", "带 (*) 的尺寸取决于实物校准，B 版可能调整。", "Dimensions marked (*) depend on the physical calibration and may change in revision B."],
  ["Planta-mãe: interior da caixa (corte horizontal z = 20)", "总装平面图：盒内布置（水平剖切 z = 20）", "Master plan: inside the box (horizontal section z = 20)"],
  ["Planta-mãe: corte longitudinal A–A (x = 0) e pilha óptica", "总装剖视图 A–A（x = 0）与光学叠层", "Master plan: section A–A (x = 0), optical stack"],
  ["M1 Suporte: vistas externas", "M1 支架：外形视图", "M1 Support: external views"],
  ["M1 Suporte: cortes A–A e B–B", "M1 支架：剖视 A–A 与 B–B", "M1 Support: sections A–A and B–B"],
  ["M1: detalhe do anel e recortes", "M1 支架：抱箍环详图与开孔表", "M1: ring detail and cut-outs"],
  ["M2 Abraçadeira do tubo (metade removível)", "M2 镜筒抱箍（可拆半环）", "M2 Tube clamp (removable half)"],
  ["M3 Tampa de fundo", "M3 底盖", "M3 Bottom lid"],
  ["M4 Difusor e assento no teto do M1", "M4 扩散片及 M1 顶板凹槽", "M4 Diffuser and its seat in the ceiling of M1"],
  ["Teto, assento do difusor e canal: detalhe H (DT-03) e detalhe G (DT-09).", "顶板详见 DT-03、DT-09。", "Ceiling, diffuser seat and channel: detail H (DT-03) and detail G (DT-09)."],
  ["PLA natural ou branco, 1 a 2 camadas de 0,2 mm (≈ 0,8 mm). Sem suportes.", "本色或白色 PLA，1~2 层 0.2 mm（约 0.8 mm）。无需支撑。", "Natural or white PLA, 1 to 2 layers of 0.2 mm (≈ 0.8 mm). No supports."],
  ["Arquivo abracadeira-tubo-impressao.stl (abre para cima), sem suportes.", "使用 abracadeira-tubo-impressao.stl（开口朝上），无需支撑。", "File abracadeira-tubo-impressao.stl (opens upward), no supports."],
  ["atravessam as orelhas e entram", "穿过耳部，拧入", "go through the ears and enter"],
  ["Confirmar no gabarito G1 antes de imprimir em série.", "批量打印前请用校准件 G1 确认。", "Confirm with jig G1 before printing in series."],
  ["Origem: eixo do tubo, z = 0 no piso da caixa.", "原点：镜筒轴线，z = 0 为灯箱底面。", "Origin: tube axis, z = 0 at the floor of the box."],
  ["Fios: ver DT-03 e a ordem das ligações (seção 4).", "导线见 DT-03 与连接顺序一节。", "Wires: see DT-03 and the wiring order (section 4)."],
  ["Posição do centro de cada peça (mm)", "零件中心位置 (mm)", "Centre position of each part (mm)"],
  ["Pilha óptica (de baixo para cima)", "光学叠层（自下而上）", "Optical stack (bottom to top)"],
  ["Tabela de recortes e furos do M1", "M1 开孔表", "Table of cut-outs and holes of M1"],
  ["(*) a confirmar com os gabaritos G1 a G3.", "（*）以校准件 G1~G3 核实。", "(*) to be confirmed with jigs G1 to G3."],
  ["Planta sem tampa e sem teto", "无底盖无顶板平面图", "Plan without lid and ceiling"],
  ["Detalhe E: planta do anel em z =", "局部详图 E：z = 处的环平面", "Detail E: plan of the ring at z ="],
  ["Detalhe G: teto do M1 em corte", "局部详图 G：M1 顶板剖面", "Detail G: ceiling of M1 in section"],
  ["Detalhe H: pilha óptica", "局部详图 H：光学叠层", "Detail H: optical stack"],
  ["Vista lateral esquerda", "左视图", "Left view"],
  ["Vista superior (orientação de impressão)", "俯视图（打印方向）", "Top view (print orientation)"],
  ["Vista superior", "俯视图", "Top view"],
  ["Vista frontal", "正视图", "Front view"],
  ["Corte", "剖视", "Section"],
  ["Conjunto geral", "总装图", "General assembly"],
  ["Conjunto", "总成", "Assembly"],
  ["folga óptica", "光学间隙", "optical gap"],
  ["Recortes principais", "主要开孔", "Main cut-outs"],
  ["Orientação de impressão", "打印方向", "Print orientation"],
  ["Material e cor", "材料与颜色", "Material and colour"],
  ["Montagem", "装配", "Assembly"],
  ["Furo do tubo", "镜筒孔", "Tube bore"],
  ["tubo medido", "实测镜筒", "measured tube"],
  ["Face superior do teto", "顶板上表面", "Top face of the ceiling"],
  ["Distância de trabalho", "工作距离", "Working distance"],
  ["Lente da objetiva", "物镜镜头", "Lens of objective"],
  ["Lâmina L1 (topo)", "载玻片 L1（顶面）", "Slide L1 (top)"],
  ["LED D1 (topo)", "LED D1（顶部）", "LED D1 (top)"],
  ["Difusor M4", "扩散片 M4", "Diffuser M4"],
  ["Janela do LED", "LED 光窗", "LED window"],
  ["Assento do difusor", "扩散片凹槽", "Diffuser seat"],
  ["Canal da lâmina", "载玻片槽道", "Slide channel"],
  ["Recorte SW1", "SW1 开孔", "SW1 cut-out"],
  ["Furo J1", "J1 孔", "J1 hole"],
  ["Furo RV1", "RV1 孔", "RV1 hole"],
  ["Janela da coluna", "立柱窗口", "Column window"],
  ["Postes da tampa", "盖板立柱", "Lid posts"],
  ["Piloto da abraçadeira", "抱箍底孔", "Clamp pilot hole"],
  ["Furos da tampa", "盖板孔", "Lid holes"],
  ["Postes da placa", "板立柱", "Board standoffs"],
  ["Porta-LED", "LED 座", "LED post"],
  ["Assento do flange", "法兰凹槽", "Flange seat"],
  ["Furo das pernas", "引脚孔", "Leg hole"],
  ["Berço da pilha", "电池仓", "Battery cradle"],
  ["janela da coluna", "立柱窗口", "column window"],
  ["janela do LED", "LED 光窗", "LED window"],
  ["assento do difusor", "扩散片凹槽", "diffuser seat"],
  ["canal da lâmina", "载玻片槽道", "slide channel"],
  ["furo do anel", "环孔", "ring bore"],
  ["passante no teto", "贯穿顶板", "through the ceiling"],
  ["por dentro do teto", "从顶板内侧", "from inside the ceiling"],
  ["passante em y", "沿 y 贯穿", "through along y"],
  ["de prof., em y", "深，沿 y", "deep, along y"],
  ["prof., em x", "深，沿 x", "deep, along x"],
  ["parede frontal", "前壁", "front wall"],
  ["parede direita", "右壁", "right wall"],
  ["entre eixos", "轴距", "centre to centre"],
  ["cego + fenda", "盲孔 + 开槽", "blind + slot"],
  ["fenda para", "开槽朝", "slot toward"],
  ["face superior em z =", "上表面 z =", "top face at z ="],
  ["lente em z =", "镜头位于 z =", "lens at z ="],
  ["Dimensão", "尺寸", "Size"],
  ["Tubo", "镜筒", "Tube"],
  ["luva", "套筒", "sleeve"],
  ["objetiva", "物镜", "objective"],
  ["folga", "间隙", "gap"],
  ["passante", "通孔", "through"],
  ["recorte", "开孔", "cut-out"],
  ["piloto", "底孔", "pilot"],
  ["janela", "光窗", "window"],
  ["assento", "凹槽", "seat"],
  ["canal", "槽道", "channel"],
  ["furo", "孔", "hole"],
  ["teto", "顶板", "ceiling"],
  ["poste", "立柱", "post"],
  ["parafuso", "螺钉", "screw"],
  ["parede", "壁厚", "wall"],
  ["centro", "中心", "centre"],
  ["hachurado", "剖面线", "hatched"],
  ["cola quente", "热熔胶", "hot glue"],
  ["Posição", "位置", "Position"],
  ["Lente", "镜头", "Lens"],
  ["Tabela", "表", "Table"],
  ["Detalhe", "详图", "Detail"],
  ["ext.", "外", "outer"],
  ["do M1", "（M1）", "of M1"],
  ["no piloto", "进底孔", "into the pilot hole"],
  ["Folga de", "间隙", "Clearance of"],
  ["mm entre as metades.", "mm（两半环之间）。", "mm between the halves."],
  ["medido", "实测", "measured"],
  ["dim.", "尺寸", "size"],
  ["R ext.", "外半径", "outer R"],
];

const SORTED = [...DICT].sort((a, b) => b[0].length - a[0].length).map(([pt, zh, en]) => {
  const esc = pt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const head = /^[\p{L}\p{N}]/u.test(pt) ? "(?<![\\p{L}\\p{N}])" : "";
  const tail = /[\p{L}\p{N}]$/u.test(pt) ? "(?![\\p{L}\\p{N}])" : "";
  return { re: new RegExp(`${head}${esc}${tail}`, "gu"), zh, en };
});

/** Portuguese text of a drawing translated with the dictionary; numbers get a decimal point outside Portuguese. */
export function translatePt(pt: string, lang: "zh" | "en"): string {
  let out = pt;
  for (const e of SORTED) out = out.replace(e.re, lang === "zh" ? e.zh : e.en);
  return out.replace(/(\d),(\d)/g, "$1.$2");
}

/** What a drawing text becomes in a language ("" hides it). The original bilingual text is kept for "bi". */
export function translateText(raw: string, lang: DocLang): string {
  if (lang === "bi") return raw;
  const { pt, zh } = splitText(raw);
  if (lang === "pt") return pt;
  if (lang === "zh") return zh || (pt ? translatePt(pt, "zh") : "");
  return pt ? translatePt(pt, "en") : "";
}

/** SVG text whose content is translated to the language of the document. */
export function T({ children, ...rest }: SVGProps<SVGTextElement> & { children?: ReactNode }) {
  const lang = useLang();
  const raw = Children.toArray(children).join("");
  const s = translateText(raw, lang);
  if (!s) return null;
  return <text {...rest}>{s}</text>;
}

/** Text in the language of the document; "bi" shows Portuguese with Chinese under it. */
export function Bi({ t, as: Tag = "span" }: { t: Bilingual; as?: "span" | "p" | "div" | "h3" | "h4" }) {
  const lang = useLang();
  if (lang === "bi") {
    return (
      <Tag className="bi">
        <span className="pt">{t.pt}</span>
        <span className="zh" lang="zh-CN">{t.zh}</span>
      </Tag>
    );
  }
  return (
    <Tag className="bi">
      <span className={lang === "zh" ? "zh1" : "pt"} lang={lang === "zh" ? "zh-CN" : lang}>{t[lang]}</span>
    </Tag>
  );
}

/** Inline label in the language of the document: "Peça · 零件" in "bi", the single word otherwise. */
export function Tx({ pt, zh, en }: { pt: string; zh: string; en: string }) {
  const lang = useLang();
  if (lang === "bi") {
    return (
      <>
        {pt} <span lang="zh-CN">/ {zh}</span>
      </>
    );
  }
  return <>{lang === "pt" ? pt : lang === "zh" ? zh : en}</>;
}

/** Same as Tx but as a plain string (for attributes and sums). */
export function useTx() {
  const lang = useLang();
  return (pt: string, zh: string, en: string) => (lang === "bi" ? `${pt} / ${zh}` : lang === "pt" ? pt : lang === "zh" ? zh : en);
}
