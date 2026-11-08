/**
 * Content of the construction manual of the economical 1000x version: names, positions, assembly steps, wiring, tests and inspection,
 * in Portuguese, Chinese and English. Positions and wires come from the same layout the printed parts are built from.
 */
import { holderLayout } from "./holder.ts";
import { bom } from "./suporte-catalog.ts";
import { EN_NAMES, ZH_NAMES, type Bilingual, type ManualStep, type PlacedPart } from "./suporte-manual.ts";
import { componentes1000x, COVER_GLASS, derived1000x, ECONOMICA_1000X_PARAMS, layoutEconomica1000x } from "./suporte-1000x.ts";
import { d2Placement, DR1_SIZE, frame1000, NETS_1000X, WIRES_1000X, wireCutList1000x } from "./suporte-1000x-eletrica.ts";

const bi = (pt: string, zh: string, en: string): Bilingual => ({ pt, zh, en });
const round = (n: number) => Math.round(n * 10) / 10;
const f = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

export const NAME_1000X = bi("Versão 1000x econômica · fonte 12 V, objetiva 100x em óleo", "1000x 经济版 · 12 V 电源，100x 油镜", "Economical 1000x version · 12 V adapter, 100x oil objective");
export const CODE_1000X = "V2-1000X";

export const STATUS_1000X: Bilingual[] = [
  bi("Pré-calibração e sem protótipo: nenhuma peça desta versão foi construída ainda. As medidas marcadas \"suposto\" na tabela da seção 3 precisam ser medidas nas peças compradas antes de imprimir em série.", "校准前版本且尚无样机：本版本尚未制作任何实物。第 3 节表中标注“suposto（假设）”的尺寸需用所购零件实测后再批量打印。", "Pre-calibration and no prototype: nothing of this version has been built yet. The dimensions marked \"suposto\" (assumed) in the table of section 3 must be measured on the purchased parts before printing in series."),
  bi("Tubo do pregoscópio: o comprimento do ombro da objetiva à borda é de 152 mm; a objetiva 160/0,17 foi calculada para 160 mm, e o máximo possível com este tubo é 155 mm.", "显微镜镜筒：物镜肩部到筒口为 152 mm；160/0.17 物镜按 160 mm 设计，此镜筒最大只能达到 155 mm。", "Pregoscope tube: from the objective shoulder to the rim it is 152 mm; the 160/0.17 objective was calculated for 160 mm, and 155 mm is the most this tube can give."),
  bi("A objetiva 100x de 45 mm de parafocal foi suposta (Bresser, Optika); a da 40x comprada mede 35 mm. Meça a 100x comprada: o comprimento define a altura do suporte (237,6 mm).", "100x 物镜按 45 mm 齐焦距离假设（Bresser、Optika）；已购 40x 物镜为 35 mm。请实测所购 100x：长度决定支架高度（237.6 mm）。", "The 100x objective was assumed to have a 45 mm parfocal distance (Bresser, Optika); the 40x bought measures 35 mm. Measure the 100x you buy: its length sets the height of the support (237.6 mm)."),
  bi("A temperatura do dissipador dentro da caixa de PLA é uma estimativa (0,7 a 1,0 W de calor a 350 mA) e não foi medida. Confira com o teste do ponto 6.", "PLA 盒内散热片温度为估算值（350 mA 时约 0.7~1.0 W 热量），未实测。请按测试第 6 点核实。", "The temperature of the heatsink inside the PLA box is an estimate (0.7 to 1.0 W of heat at 350 mA) and was not measured. Check it with test point 6."),
  bi("O driver é um módulo único de 350 mA para entrada de 12 V. Não achei um à venda no Brasil: a alternativa é um módulo de corrente constante de 2,8 a 6 V atrás de um step-down.", "驱动为 12 V 输入、350 mA 的单模块。巴西未找到现货：替代方案是在降压模块后接 2.8~6 V 恒流模块。", "The driver is one module for 12 V in and 350 mA out. I did not find one on sale in Brazil: the alternative is a 2.8 to 6 V constant-current module behind a step-down."),
  bi("Este instrumento não é um equipamento de diagnóstico e não foi validado contra um microscópio de referência.", "本仪器不是诊断设备，也未与参考显微镜对照验证。", "This instrument is not diagnostic equipment and has not been validated against a reference microscope."),
  bi("O texto em chinês e em inglês foi escrito sem tradutor técnico e precisa de revisão por um falante nativo.", "中文和英文内容未经专业技术翻译，需由母语人员审校。", "The Chinese and English text was written without a technical translator and needs review by a native speaker."),
];

export const TOOLS_1000X: Bilingual[] = [
  bi("Impressora 3D FDM, mesa de pelo menos 300 mm, PLA (PLA preto para o tubo de luz)", "FDM 3D 打印机，打印平台不小于 300 mm，PLA 耗材（光管用黑色 PLA）", "FDM 3D printer, bed of at least 300 mm, PLA filament (black PLA for the light tube)"),
  bi("Ferro de soldar 30 a 40 W, solda 0,8 mm, alicate descascador, termorretrátil", "30~40 W 电烙铁，0.8 mm 焊锡，剥线钳，热缩管", "30 to 40 W soldering iron, 0.8 mm solder, wire stripper, heat-shrink"),
  bi("Multímetro com entrada de 10 A (a de mA tem fusível pequeno); termômetro de contato ou infravermelho", "带 10 A 档的万用表（mA 档保险丝较小）；接触式或红外测温计", "Multimeter with a 10 A input (the mA input has a small fuse); contact or infrared thermometer"),
  bi("Pasta térmica, pistola de cola quente, fita dupla face", "导热硅脂，热熔胶枪，双面胶带", "Thermal paste, hot-glue gun, double-sided tape"),
  bi("Chave Phillips pequena; paquímetro e micrômetro; papel de lente e álcool isopropílico", "小号十字螺丝刀；游标卡尺和千分尺；擦镜纸和异丙醇", "Small Phillips screwdriver; caliper and micrometer; lens paper and isopropyl alcohol"),
];

export const SAFETY_1000X: Bilingual[] = [
  bi("Ferro de soldar a cerca de 300 °C, cola quente e termorretrátil queimam: use o suporte, ventile o local e espere esfriar.", "烙铁约 300 °C，热熔胶和热缩管会烫伤：使用烙铁架、保持通风并等其冷却。", "Soldering iron at about 300 °C, hot glue and heat-shrink burn: use the stand, ventilate and let them cool."),
  bi("Não olhe direto para o LED de 3 W aceso e não o ligue sem o dissipador: ele queima em poucos segundos.", "不要直视点亮的 3 W LED；未装散热片切勿通电：几秒内即会烧毁。", "Do not look straight at the lit 3 W LED and do not power it without the heatsink: it burns out in seconds."),
  bi("Meça a corrente do LED na entrada de 10 A do multímetro, em série; a entrada de mA tem fusível pequeno e queima a 350 mA.", "用万用表 10 A 档串联测量 LED 电流；mA 档保险丝小，350 mA 会熔断。", "Measure the LED current on the 10 A input of the multimeter, in series; the mA input has a small fuse and blows at 350 mA."),
  bi("Confira a polaridade antes de ligar (D2, LED, plugue de centro positivo). O driver não tem proteção contra polaridade invertida.", "通电前核对极性（D2、LED、中心正极插头）。驱动模块无反接保护。", "Check the polarity before switching on (D2, LED, plug with positive centre). The driver has no reverse-polarity protection."),
  bi("Use somente a fonte de 12 V indicada. O dissipador e o driver esquentam: não toque logo depois de desligar.", "仅使用指定的 12 V 电源。散热片和驱动会发热：断电后不要立即触碰。", "Use only the 12 V adapter indicated. The heatsink and the driver get hot: do not touch right after switching off."),
  bi("Óleo de imersão: siga a ficha do fabricante, evite contato com a pele e os olhos e limpe qualquer gota que caia na caixa.", "浸油：遵守厂家说明书，避免接触皮肤和眼睛，并擦净滴入盒内的油。", "Immersion oil: follow the maker's sheet, avoid contact with skin and eyes and wipe any drop that falls into the box."),
  bi("Não aperte demais os parafusos em PLA e não force a ponta da objetiva contra a lamínula.", "PLA 上的螺钉不要拧得过紧，不要用物镜前端顶压盖玻片。", "Do not overtighten screws in PLA and do not force the tip of the objective against the cover glass."),
];

export const PRINT_1000X: { part: string; text: Bilingual }[] = [
  { part: "M1", text: bi("arquivo -impressao, deitado nas costas; suportes só dentro da caixa e na fenda da roda", "使用 -impressao 文件，背面朝下打印；仅在盒内和转盘槽处加支撑", "file -impressao, lying on its back; supports only inside the box and at the wheel slot") },
  { part: "M2", text: bi("arquivo -impressao, abre para cima; sem suportes (a abraçadeira desta versão é mais alta que a da 400x)", "使用 -impressao 文件，开口朝上；无需支撑（本版抱箍位置比 400x 版更高）", "file -impressao, opening upward; no supports (the clamp of this version sits higher than the 400x one)") },
  { part: "M3", text: bi("já plana; sem suportes; os 12 furos de ventilação ficam em volta do dissipador", "已是平板；无需支撑；12 个通风孔位于散热片周围", "already flat; no supports; the 12 air holes lie around the heatsink") },
  { part: "M4", text: bi("plano, PLA natural ou branco, 1 a 2 camadas; sem suportes", "平放，本色或白色 PLA，1~2 层；无需支撑", "flat, natural or white PLA, 1 to 2 layers; no supports") },
  { part: "M5", text: bi("em pé, PLA preto, a fenda do pé voltada para o lado; sem suportes; o pino do topo é fino: imprima devagar", "竖直打印，黑色 PLA，底部缺口朝侧；无需支撑；顶部销较细：请降速打印", "standing, black PLA, the foot slot to the side; no supports; the pin at the top is thin: print slowly") },
  { part: "AP1", text: bi("arquivo -impressao, deitada; 3 perímetros e enchimento de 100 %; sem suportes", "使用 -impressao 文件，平放；3 层外壁，100% 填充；无需支撑", "file -impressao, flat; 3 perimeters and 100 % infill; no supports") },
];

export const QA_1000X: Bilingual[] = [
  bi("A lâmina L1 com a lamínula CV1 desliza no canal sem esforço e sem folga lateral visível.", "载玻片 L1（带盖玻片 CV1）在槽道内滑动顺畅，侧向无明显间隙。", "The slide L1 with the cover glass CV1 moves in the channel without effort and without visible side play."),
  bi("O tubo do pregoscópio entra no anel e fica preso pela M2 sem rachar o PLA.", "显微镜镜筒装入环中，由 M2 夹紧，PLA 无开裂。", "The pregoscope tube fits the ring and is held by M2 without cracking the PLA."),
  bi("Com o tubo interno estendido 37 mm na escala, a objetiva 100x fica a cerca de 0,18 mm da lamínula e a imagem foca com uma gota de óleo.", "内镜筒按刻度伸出 37 mm 时，100x 物镜距盖玻片约 0.18 mm，滴一滴油后图像可对焦。", "With the inner tube pulled out 37 mm on the scale, the 100x objective sits about 0.18 mm from the cover glass and the image focuses with one drop of oil."),
  bi("O LED acende e a luz é uniforme sobre a janela, sem ponto quente.", "LED 点亮，光窗光线均匀，无亮斑。", "The LED lights and the light is even over the window, with no hot spot."),
  bi("Corrente do LED medida entre 330 e 370 mA; tensão sobre o LED entre 3,0 e 3,6 V.", "LED 电流在 330~370 mA 之间；LED 电压在 3.0~3.6 V 之间。", "LED current measured between 330 and 370 mA; voltage across the LED between 3.0 and 3.6 V."),
  bi("Dissipador a no máximo 50 °C depois de 30 minutos com o LED aceso, com a tampa fechada.", "盖板合上、LED 点亮 30 分钟后散热片不超过 50 °C。", "Heatsink at 50 °C at most after 30 minutes with the LED on and the lid closed."),
  bi("A roda de aberturas gira com o dedo, cada furo (24, 10, 2, 5 e 16 mm) fica no eixo sem folga excessiva e a roda não raspa na parede nem na tampa.", "孔径转盘可用手指拨动，每个孔（24、10、2、5、16 mm）都能对准光轴且无过大间隙，转盘不刮擦盒壁和盖板。", "The aperture wheel turns with a finger, each hole (24, 10, 2, 5 and 16 mm) sits on the axis without too much play and the wheel does not rub on the wall or the lid."),
  bi("Tampa fechada com 4 parafusos, sem fio preso, com folga nos fios F1 a F3; óleo não escorreu para dentro da caixa.", "底盖用 4 颗螺钉关紧，无夹线，F1~F3 导线留有余量；油未流入盒内。", "Lid closed with 4 screws, no trapped wire, slack in wires F1 to F3; no oil ran into the box."),
  bi("Nada solto ao sacudir de leve; sem rebarbas nas peças impressas.", "轻轻晃动无松动部件；打印件无毛刺。", "Nothing loose when shaken gently; no burrs on the printed parts."),
];

interface BomRow {
  id: string;
  name: Bilingual;
  qty: number;
  kind: "impressa" | "comprada" | "referencia";
  spec: Bilingual;
}

const shared = new Map(bom("v2").map((l) => [l.part.id, l] as const));
const cat = (id: string, qty?: number): BomRow => {
  const l = shared.get(id)!;
  return { id, name: bi(l.part.name, ZH_NAMES[id] ?? l.part.name, EN_NAMES[id] ?? l.part.name), qty: qty ?? l.qty, kind: l.part.kind as BomRow["kind"], spec: bi(l.part.spec ?? "", "", "") };
};

/** Bill of materials of the 1000x version; the pregoscope (P1 to P10) is supplied by the customer, and so is the WF10X eyepiece. */
export function bom1000x(): BomRow[] {
  const items = componentes1000x();
  const dims = (id: string) => items.find((c) => c.id === id)?.dims ?? "";
  const row = (id: string, name: Bilingual, qty: number, kind: BomRow["kind"], dimsText?: string): BomRow => ({ id, name, qty, kind, spec: bi(dimsText ?? dims(id), dimsText ?? dims(id), dimsText ?? dims(id)) });
  return [
    row("M1", cat("M1").name, 1, "impressa", `${f(layoutEconomica1000x().totalHeight)} mm`),
    cat("M2"), cat("M3"), cat("M4"),
    row("M5", bi("Tubo de luz com pino da roda (impresso, preto)", "光管（带转盘销，黑色打印）", "Light tube with wheel pin (printed, black)"), 1, "impressa"),
    row("AP1", bi("Roda de aberturas (impressa)", "孔径转盘（打印）", "Aperture wheel (printed)"), 1, "impressa"),
    cat("P1"), cat("P2"), cat("P3"), cat("P4"), cat("P5"), cat("P6"), cat("P10"),
    row("P9", bi("Objetiva 100x/1,25 em óleo (160/0,17, RMS, ponta com mola)", "100x/1.25 油镜物镜（160/0.17，RMS，弹簧镜头）", "100x/1.25 oil objective (160/0.17, RMS, spring tip)"), 1, "comprada"),
    row("D1", bi("LED branco frio de 3 W em estrela de alumínio", "3 W 冷白 LED（铝基板）", "3 W cool-white LED on an aluminium star board"), 1, "comprada"),
    row("HS1", bi("Dissipador redondo de alumínio", "圆形铝散热片", "Round aluminium heatsink"), 1, "comprada"),
    row("DR1", bi("Driver de corrente constante de 350 mA, entrada de 12 V", "350 mA 恒流驱动模块，12 V 输入", "Constant-current driver, 350 mA, 12 V input"), 1, "comprada"),
    cat("D2"), cat("SW1"),
    row("J1", bi("Conector P4 de painel DC-022B", "P4 面板插座 DC-022B", "P4 panel jack DC-022B"), 1, "comprada"),
    row("PS1", bi("Fonte chaveada de 12 V e 1 A, plugue P4 de centro positivo", "12 V 1 A 开关电源，P4 插头，中心正极", "12 V 1 A switching adapter, P4 plug, positive centre"), 1, "comprada"),
    row("PCB1", bi("Placa ilhada 40 × 25 mm (leva o driver)", "40 × 25 mm 万用板（承载驱动模块）", "Perforated board 40 × 25 mm (carries the driver)"), 1, "comprada"),
    row("H1", cat("H1").name, 4, "comprada", "M3 × 10"),
    row("H2", cat("H2").name, 2, "comprada", "M3 × 16"),
    row("H3", cat("H3").name, 4, "comprada", "M3 × 8"),
    row("W1", bi("Fio flexível 24 AWG, 5 fios (ver a lista de corte)", "24 AWG 软导线，5 根（见下料表）", "24 AWG flexible wire, 5 wires (see the cut list)"), 1, "comprada"),
    cat("W2"), cat("W3"),
    row("TP1", bi("Pasta térmica", "导热硅脂", "Thermal paste"), 1, "comprada", "—"),
    cat("L1"),
    row("CV1", bi("Lamínula 22 × 22 × 0,17 mm", "22 × 22 × 0.17 mm 盖玻片", "Cover glass 22 × 22 × 0.17 mm"), 1, "comprada"),
    row("OIL", bi("Óleo de imersão para microscopia (100 ml)", "显微镜浸油（100 ml）", "Microscope immersion oil (100 ml)"), 1, "comprada", "nD ≈ 1,518"),
  ];
}

/** Position of every part in the master frame (origin on the tube axis, z = 0 at the top of the lid). */
export function masterPlan1000x(): PlacedPart[] {
  const layout = layoutEconomica1000x();
  const { box, ring, tube, board, params: p } = layout;
  const t = layout.lightTube!;
  const fr = frame1000();
  const d2 = d2Placement();
  const bx = (board.xMin + board.xMax) / 2;
  const by = (board.yMin + board.yMax) / 2;
  const swZ = box.height / 2;
  const put = (id: string, x: number, y: number, z: number, size: [number, number, number], mount: Bilingual, hidden = false): PlacedPart => ({
    id, x: round(x), y: round(y), z: round(z), size: size.map(round) as [number, number, number], mount, hidden,
  });
  return [
    put("M1", 0, (box.yMin + box.yMax) / 2, layout.totalHeight / 2, [box.xMax - box.xMin, box.yMax - box.yMin, layout.totalHeight], bi("apoiado na mesa", "放置于桌面", "standing on the table")),
    put("M3", 0, (box.yMin + box.yMax) / 2, -p.wall / 2, [box.xMax - box.xMin, box.yMax - box.yMin, p.wall], bi("4 parafusos H1 nos cantos", "四角 4 颗 H1 螺钉", "4 screws H1 at the corners"), true),
    put("M5", 0, 0, t.top / 2, [t.outerDiameter + 12, t.outerDiameter, t.top], bi("em pé sobre a tampa, cola quente na base, fenda do pé voltada para a coluna (+y)", "竖立在盖板上，底部热熔胶固定，底部缺口朝向立柱（+y）", "standing on the lid, hot glue at the base, foot slot toward the column (+y)"), true),
    put("HS1", 0, 0, t.heatsinkTop / 2, [p.heatsinkDiameter, p.heatsinkDiameter, t.heatsinkTop], bi("no centro da tampa, dentro do tubo de luz, colado com cola quente na base", "位于盖板中心、光管内，底部热熔胶固定", "at the centre of the lid, inside the light tube, hot-glued at the base"), true),
    put("D1", 0, 0, t.heatsinkTop + p.ledStarThickness / 2, [p.ledStarDiameter, p.ledStarDiameter, p.ledStarThickness + 3.2], bi("estrela sobre o dissipador, com pasta térmica (TP1)", "铝基板放在散热片上，涂导热硅脂（TP1）", "star board on the heatsink, with thermal paste (TP1)"), true),
    put("PCB1", bx, by, board.standoffHeight + 0.8, [board.xMax - board.xMin, board.yMax - board.yMin, 1.6], bi("4 parafusos H3 nos suportes de 6 mm", "4 颗 H3 螺钉固定在 6 mm 立柱上", "4 screws H3 on the 6 mm standoffs"), true),
    put("DR1", bx, by, fr.boardTop + DR1_SIZE[2] / 2, DR1_SIZE, bi("colado sobre a PCB1 (cola quente ou fita dupla face); entradas à esquerda, saídas à direita", "粘在 PCB1 上（热熔胶或双面胶）；输入在左，输出在右", "glued on PCB1 (hot glue or double-sided tape); inputs on the left, outputs on the right"), true),
    put("D2", d2.center[0], d2.center[1], d2.center[2], [2.7, 13, 2.7], bi("ânodo soldado no terminal + do J1, corpo no ar ao longo de y, faixa para o lado livre", "阳极焊在 J1 的 + 端子上，管体沿 y 悬空，色环端朝自由端", "anode soldered to the + lug of J1, body in the air along y, band toward the free end"), true),
    put("SW1", p.switchCutout.x, box.yMin + p.wall / 2, swZ, [p.switchCutout.width, 10, p.switchCutout.height], bi("recorte da parede frontal, travas a pressão", "前壁开孔，卡扣固定", "front-wall cut-out, snap tabs")),
    put("J1", box.xMax - p.wall / 2, p.jackY, swZ, [p.wall + 10, p.jackDiameter, p.jackDiameter], bi("furo da parede direita (atrás do tubo de luz), porca por fora", "右壁开孔（光管后方），螺母在外侧", "right-wall hole (behind the light tube), nut outside")),
    put("PS1", box.xMax + 40, p.jackY, swZ, [38, 26, 24], bi("fora da caixa, cabo ao conector J1", "位于盒外，电缆接插座 J1", "outside the box, cable to the jack J1")),
    put("M4", 0, 0, layout.cavity.top + 0.6, [p.diffuserDiameter, p.diffuserDiameter, p.diffuserThickness], bi("cola quente (W3) no encaixe do teto", "用热熔胶（W3）粘在顶部凹槽", "hot glue (W3) in the ceiling seat"), true),
    put("AP1", t.wheel.pivotX, 0, (t.wheel.bottom + t.wheel.top) / 2, [t.wheel.radius * 2, t.wheel.radius * 2, t.wheel.thickness], bi("entra de lado pela fenda da parede direita e gira no pino do M5", "从右壁槽口侧向装入，绕 M5 的销转动", "slides in from the side through the right-wall slot and turns on the pin of M5"), true),
    put("L1", 0, 0, layout.samplePlane - COVER_GLASS - 0.5, [76, 26, 1], bi("deslizada no canal, de lado", "从侧面滑入槽道", "slid into the channel from the side")),
    put("CV1", 0, 0, layout.samplePlane - COVER_GLASS / 2, [22, 22, COVER_GLASS], bi("sobre a lâmina, sobre o material a observar", "放在载玻片上，覆盖观察样品", "on the slide, over the sample")),
    put("OIL", 0, 0, layout.samplePlane + (p.workingDistance - COVER_GLASS) / 2, [5, 5, p.workingDistance - COVER_GLASS], bi("uma gota entre a lamínula e a objetiva", "盖玻片与物镜之间一滴油", "one drop between the cover glass and the objective")),
    put("H1", 0, 0, -p.wall / 2, [5.6, 5.6, 2], bi("4 furos da tampa (ver tabela abaixo)", "盖板 4 孔（见下表）", "4 lid holes (see the table below)"), true),
    put("H2", 0, -12.8, (ring.bottom + ring.top) / 2, [2 * 24.4 + 5.6, 16, 5.6], bi("2 orelhas da abraçadeira, eixo Y (ver tabela abaixo)", "抱箍 2 个耳部，沿 Y 轴（见下表）", "2 clamp ears, Y axis (see the table below)")),
    put("H3", bx, by, board.standoffHeight + 1.6, [5.6, 5.6, 2], bi("4 furos da PCB1 (ver tabela abaixo)", "PCB1 4 孔（见下表）", "4 PCB1 holes (see the table below)"), true),
    put("M2", 0, -(ring.outerRadius + ring.gap) / 2, (ring.bottom + ring.top) / 2, [2 * (layout.ears[1]!.x + layout.ears[1]!.width / 2), ring.outerRadius - ring.gap, ring.top - ring.bottom], bi("2 parafusos H2 nas orelhas", "耳部 2 颗 H2 螺钉", "2 screws H2 on the ears")),
    put("W1", 0, 10, 14, [80, 80, 20], bi("5 fios F1 a F5 entre as peças, pelos trajetos da lista de corte", "5 根导线 F1~F5 按下料表路径连接各零件", "5 wires F1 to F5 between the parts, along the paths of the cut list"), true),
    put("W2", 0, 24, 5, [10, 10, 4], bi("sobre as emendas, 1 cm cada", "套在焊点上，每处 1 cm", "over the joints, 1 cm each"), true),
    put("W3", 0, 0, layout.cavity.top + 0.4, [p.diffuserDiameter, p.diffuserDiameter, 1], bi("cordão na borda do difusor", "扩散片边缘的胶圈", "bead around the diffuser edge"), true),
    put("P9", 0, 0, tube.noseZ + p.objectiveLength / 2, [p.objectiveDiameter, p.objectiveDiameter, p.objectiveLength], bi("rosqueada no tubo interno do pregoscópio", "旋在显微镜内镜筒上", "screwed to the inner tube of the pregoscope")),
    put("P2", 0, 0, (tube.bottom + tube.top) / 2, [p.tubeDiameter, p.tubeDiameter, tube.top - tube.bottom], bi("no anel da coluna, preso pela M2", "放入立柱环，由 M2 夹紧", "in the column ring, held by M2")),
    put("P1", 0, 0, tube.top + 7.5, [50, 50, 15], bi("apoiada no topo do anel", "放在环的顶部", "resting on top of the ring")),
  ];
}

export function screwPositions1000x(): { id: string; x: number; y: number; z: number }[] {
  const layout = layoutEconomica1000x();
  const out: { id: string; x: number; y: number; z: number }[] = [];
  layout.lid.holes.forEach((h) => out.push({ id: "H1", x: round(h.x), y: round(h.y), z: -layout.params.wall }));
  layout.boardPosts.forEach((b) => out.push({ id: "H3", x: round(b.x), y: round(b.y), z: round(b.top) }));
  layout.ears.forEach((e) => out.push({ id: "H2", x: round(e.x), y: -12.8, z: round(e.z) }));
  return out;
}

export function steps1000x(): ManualStep[] {
  const d = derived1000x();
  const list: Omit<ManualStep, "n">[] = [
    {
      title: bi("Pôr o LED no dissipador e o tubo de luz na tampa (M3, M5, HS1, D1, TP1)", "把 LED 装到散热片上，光管装到盖板 (M3, M5, HS1, D1, TP1)", "Put the LED on the heatsink and the light tube on the lid (M3, M5, HS1, D1, TP1)"),
      text: bi(
        "Passe uma camada fina de pasta térmica (TP1) na parte de baixo da estrela do LED (D1) e assente-a no centro do dissipador (HS1), que fica colado com cola quente no centro da tampa (M3). Os dois pads da estrela (+ vermelho, − azul) ficam virados para a frente. Ponha o tubo de luz (M5) em volta, com a fenda do pé voltada para o lado da coluna (+y), e cole a base com cola quente.",
        "在 LED（D1）铝基板底面涂一薄层导热硅脂（TP1），放在散热片（HS1）中心；散热片用热熔胶固定在盖板（M3）中心。基板上两个焊盘（+ 红，− 蓝）朝向前方。把光管（M5）套在外面，底部缺口朝向立柱一侧（+y），底部用热熔胶固定。",
        "Spread a thin layer of thermal paste (TP1) on the underside of the LED star (D1) and set it on the centre of the heatsink (HS1), which is hot-glued to the centre of the lid (M3). The two pads of the star (+ red, − blue) face the front. Put the light tube (M5) around it, with the foot slot toward the column (+y), and hot-glue its base.",
      ),
      adds: ["M3", "M5", "HS1", "D1"], lidDrop: 0, view: "lid", lightOn: false,
      check: bi("dissipador no centro; fenda do tubo para a coluna", "散热片居中；光管缺口朝向立柱", "heatsink at the centre; tube slot toward the column"),
      warn: bi("Não ligue o LED sem o dissipador.", "未装散热片不要点亮 LED。", "Do not power the LED without the heatsink."),
      minutes: 15,
    },
    {
      title: bi("Fixar a placa PCB1 e o driver DR1 (PCB1, DR1, H3)", "固定 PCB1 板和驱动 DR1 (PCB1, DR1, H3)", "Fix the board PCB1 and the driver DR1 (PCB1, DR1, H3)"),
      text: bi(
        "Aparafuse a placa ilhada de 40 × 25 mm (PCB1) nos 4 suportes de 6 mm com 4 parafusos M3 × 8 (H3), atrás do tubo de luz. Cole o driver (DR1) no centro da placa, com as entradas (IN+, IN−) para a esquerda e as saídas (LED+, LED−) para a direita.",
        "用 4 颗 M3 × 8 螺钉（H3）把 40 × 25 mm 万用板（PCB1）固定在光管后方的 4 个 6 mm 立柱上。把驱动（DR1）粘在板中央，输入（IN+、IN−）朝左，输出（LED+、LED−）朝右。",
        "Screw the 40 × 25 mm perforated board (PCB1) on the 4 standoffs of 6 mm with 4 screws M3 × 8 (H3), behind the light tube. Glue the driver (DR1) at the centre of the board, with the inputs (IN+, IN−) to the left and the outputs (LED+, LED−) to the right.",
      ),
      adds: ["PCB1", "DR1", "H3"], lidDrop: 0, view: "lid", lightOn: false,
      check: bi("o driver não encosta no tubo de luz", "驱动不碰到光管", "the driver does not touch the light tube"),
      minutes: 10,
    },
    {
      title: bi("Instalar o conector J1, a chave SW1 e o diodo D2 na caixa (M1, SW1, J1, D2)", "在灯箱上安装插座 J1、开关 SW1 和二极管 D2 (M1, SW1, J1, D2)", "Install the jack J1, the switch SW1 and the diode D2 in the box (M1, SW1, J1, D2)"),
      text: bi(
        "Na caixa (M1) de cabeça para baixo, encaixe a chave SW1 no recorte da parede frontal e o conector J1 no furo da parede direita (atrás do tubo de luz, em y = 32 mm), com a porca por fora. Solde o ânodo do diodo D2 (lado sem faixa) ao terminal + do J1; o corpo do D2 fica no ar, ao longo de y, com a faixa para o lado livre.",
        "将灯箱（M1）倒置，把开关 SW1 卡入前壁开孔，把插座 J1 装入右壁孔（光管后方，y = 32 mm），螺母在外侧。把二极管 D2 的阳极（无色环端）焊到 J1 的 + 端子；D2 管体沿 y 方向悬空，色环端为自由端。",
        "With the box (M1) upside down, snap the switch SW1 into the front-wall cut-out and fit the jack J1 in the right-wall hole (behind the light tube, at y = 32 mm), nut outside. Solder the anode of the diode D2 (the end without the band) to the + lug of J1; D2 stands in the air along y, band toward the free end.",
      ),
      adds: ["M1", "SW1", "J1", "D2"], lidDrop: 60, view: "iso", lightOn: false,
      check: bi("a faixa do D2 está no cátodo (lado livre)", "D2 色环在阴极（自由端）", "the band of D2 is on the cathode (free end)"),
      warn: bi("Diodo ao contrário bloqueia a corrente: a faixa fica no lado que vai para a chave.", "二极管接反会阻断电流：色环端接向开关。", "A reversed diode blocks the current: the band goes on the side toward the switch."),
      minutes: 15,
    },
    {
      title: bi("Cortar e soldar os cinco fios F1 a F5 (W1, W2)", "裁剪并焊接五根导线 F1~F5 (W1, W2)", "Cut and solder the five wires F1 to F5 (W1, W2)"),
      text: bi(
        "Corte os cinco fios pelas medidas da lista de corte e descasque 6 mm de cada ponta. Solde na ordem da lista de soldagem: F4 e F5 (amarelo e azul) passam pela fenda do pé do tubo de luz até os pads da estrela; F1 liga o cátodo do D2 à chave, F2 liga a chave à entrada IN+ do driver, F3 liga o − do J1 à entrada IN−. Proteja as emendas com termorretrátil (W2).",
        "按下料表尺寸裁剪五根导线，两端各剥 6 mm。按焊接顺序焊接：F4、F5（黄、蓝）穿过光管底部缺口，焊到 LED 基板焊盘；F1 连接 D2 阴极和开关，F2 连接开关和驱动 IN+，F3 连接 J1 的 − 和驱动 IN−。焊点用热缩管（W2）保护。",
        "Cut the five wires to the lengths of the cut list and strip 6 mm from each end. Solder in the order of the soldering list: F4 and F5 (yellow and blue) go through the foot slot of the light tube to the pads of the star; F1 joins the cathode of D2 to the switch, F2 joins the switch to the input IN+ of the driver, F3 joins the − of J1 to the input IN−. Protect the joints with heat-shrink (W2).",
      ),
      adds: ["W1", "W2"], lidDrop: 60, view: "lid", lightOn: false,
      check: bi("cada fio na cor e no pad da lista; nenhum fio toca o dissipador", "每根导线颜色和焊盘与清单一致；没有导线碰到散热片", "each wire in the colour and on the pad of the list; no wire touches the heatsink"),
      minutes: 30,
    },
    {
      title: bi("Teste elétrico na bancada, com a tampa aberta", "盖板打开，在工作台上做电气测试", "Electrical test on the bench, with the lid open"),
      text: bi(
        "Antes de fechar, ligue a fonte e siga o plano de teste da seção 6, ponto por ponto: tensão da fonte, depois do D2, entrada do driver, tensão sobre o LED, corrente do LED na entrada de 10 A. Deixe o LED aceso por 30 minutos e meça a temperatura do dissipador. Se uma leitura sair da faixa, pare e corrija antes de continuar.",
        "关盖前接通电源，按第 6 节测试计划逐点测量：电源电压、D2 之后、驱动输入、LED 电压、10 A 档测 LED 电流。让 LED 点亮 30 分钟并测量散热片温度。如有读数超出范围，请先排除故障再继续。",
        "Before closing, switch the power on and follow the test plan of section 6 point by point: supply voltage, after D2, driver input, voltage across the LED, LED current on the 10 A input. Leave the LED on for 30 minutes and measure the temperature of the heatsink. If a reading is out of range, stop and fix it before going on.",
      ),
      adds: [], also: ["D1"], lidDrop: 60, view: "lid", lightOn: true,
      check: bi("350 mA no LED e dissipador até 50 °C", "LED 电流 350 mA，散热片不超过 50 °C", "350 mA in the LED and heatsink up to 50 °C"),
      minutes: 40,
    },
    {
      title: bi("Colar o difusor (M4, W3)", "粘贴扩散片 (M4, W3)", "Glue the diffuser (M4, W3)"),
      text: bi(
        "Por dentro da caixa, ponha o difusor (M4) no encaixe do teto, sobre a janela do LED, e faça um cordão de cola quente (W3) na borda. A cola não pode cobrir a janela.",
        "在灯箱内侧把扩散片（M4）放入顶板凹槽、盖住 LED 光窗，沿边缘打一圈热熔胶（W3）。胶不得遮住光窗。",
        "From inside the box, set the diffuser (M4) in the seat of the ceiling, over the window of the LED, and run a bead of hot glue (W3) on its edge. The glue must not cover the window.",
      ),
      adds: ["M4", "W3"], lidDrop: 60, view: "iso", lightOn: true,
      check: bi("o difusor não balança e a janela está livre", "扩散片不晃动，光窗无遮挡", "the diffuser does not rock and the window is free"),
      minutes: 10,
    },
    {
      title: bi("Fechar a tampa (H1)", "合上底盖 (H1)", "Close the lid (H1)"),
      text: bi(
        "Suba a tampa até a caixa sem prender nenhum fio (deixe a folga dos fios F1 a F3) e aperte os 4 parafusos M3 × 10 (H1) nos cantos. Aperte aos poucos, em cruz, sem forçar o plástico.",
        "把底盖托到灯箱下方，确保不夹住任何导线（F1~F3 留有余量），在四角拧入 4 颗 M3 × 10 螺钉 (H1)。分次交叉拧紧，不要过度用力。",
        "Raise the lid to the box without trapping any wire (leave the slack of wires F1 to F3) and tighten the 4 screws M3 × 10 (H1) at the corners. Tighten a little at a time, in a cross pattern, without forcing the plastic.",
      ),
      adds: ["H1"], lidDrop: 40, view: "lid", lightOn: true,
      minutes: 10,
    },
    {
      title: bi("Colocar a roda de aberturas (AP1)", "安装孔径转盘 (AP1)", "Fit the aperture wheel (AP1)"),
      text: bi(
        "Com a tampa fechada, entre com a roda (AP1) de lado pela fenda da parede direita, com a borda na frente, até o furo central cair no pino do tubo de luz (M5). Gire a roda: cada um dos cinco furos (24, 10, 2, 5 e 16 mm) deve parar no eixo da janela, e a borda deve sair cerca de 13 mm para fora da caixa.",
        "盖板关好后，让转盘（AP1）边缘朝前，从右壁槽口侧向推入，直到中心孔落在光管（M5）的销上。拨动转盘：五个孔（24、10、2、5、16 mm）都应能停在光窗轴线上，转盘边缘应伸出盒外约 13 mm。",
        "With the lid closed, slide the wheel (AP1) in sideways through the slot of the right wall, edge first, until the central hole drops onto the pin of the light tube (M5). Turn the wheel: each of the five holes (24, 10, 2, 5 and 16 mm) must stop on the axis of the window, and the edge must stick out about 13 mm from the box.",
      ),
      adds: ["AP1"], lidDrop: 0, view: "iso", lightOn: true,
      check: bi("a roda gira sem raspar e nenhum furo fica pela metade na janela", "转盘转动不刮擦，没有孔只露出一半在光窗内", "the wheel turns without rubbing and no hole sits half on the window"),
      minutes: 5,
    },
    {
      title: bi("Encaixar o pregoscópio com a objetiva 100x (M2, H2, P1 a P10, PS1)", "装入带 100x 物镜的显微镜 (M2, H2, P1~P10, PS1)", "Fit the pregoscope with the 100x objective (M2, H2, P1 to P10, PS1)"),
      text: bi(
        "Rosqueie a objetiva 100x (P9) na ponta do tubo interno. Ponha o tubo externo (P2) no anel da coluna e feche a abraçadeira (M2) com 2 parafusos M3 × 16 (H2) sem apertar demais. O ocular WF10X (fornecido pelo cliente) vai na borda do tubo externo. Ligue a fonte de 12 V (PS1) no conector J1.",
        "把 100x 物镜（P9）旋在内镜筒前端。把外镜筒（P2）放入立柱环，用 2 颗 M3 × 16 螺钉（H2）合上抱箍（M2），不要拧得过紧。WF10X 目镜（客户提供）装在外镜筒口。把 12 V 电源（PS1）接到插座 J1。",
        "Screw the 100x objective (P9) on the tip of the inner tube. Put the outer tube (P2) in the ring of the column and close the clamp (M2) with 2 screws M3 × 16 (H2) without overtightening. The WF10X eyepiece (supplied by the customer) goes on the rim of the outer tube. Plug the 12 V adapter (PS1) into the jack J1.",
      ),
      adds: ["M2", "H2", "P1", "P2", "P3", "P4", "P5", "P6", "P10", "P9", "PS1"], lidDrop: 0, view: "iso", lightOn: true,
      check: bi(`tubo de ${f(d.tubeLength, 0)} mm do ombro da objetiva à borda`, `物镜肩部到筒口 ${f(d.tubeLength, 0)} mm`, `${f(d.tubeLength, 0)} mm from the objective shoulder to the rim`),
      minutes: 15,
    },
    {
      title: bi("Pôr a lâmina, a lamínula e o óleo e focar (L1, CV1, OIL)", "放置载玻片、盖玻片和浸油并对焦 (L1, CV1, OIL)", "Put the slide, the cover glass and the oil, and focus (L1, CV1, OIL)"),
      text: bi(
        "Cubra a amostra da lâmina (L1) com a lamínula de 0,17 mm (CV1) e deslize a lâmina no canal. Ponha uma gota de óleo (OIL) de cerca de 5 mm sobre a lamínula. Com a roda em 24 mm, estenda o tubo interno até 37 mm na escala e desça devagar até o óleo tocar a objetiva; foque girando o tubo, sem forçar a ponta com mola. Depois reduza a abertura da roda para ajustar o brilho e o contraste.",
        "用 0.17 mm 盖玻片（CV1）盖住载玻片（L1）上的样品，把载玻片滑入槽道。在盖玻片上滴一滴约 5 mm 的油（OIL）。转盘置于 24 mm，把内镜筒按刻度伸出 37 mm，缓慢下降直到油接触物镜；转动镜筒对焦，不要用力顶压弹簧镜头。然后缩小转盘孔径以调节亮度和对比度。",
        "Cover the sample of the slide (L1) with the 0.17 mm cover glass (CV1) and slide the slide into the channel. Put a drop of oil (OIL) of about 5 mm on the cover glass. With the wheel at 24 mm, pull the inner tube out to 37 mm on the scale and go down slowly until the oil touches the objective; focus by turning the tube, without forcing the spring tip. Then reduce the opening of the wheel to adjust brightness and contrast.",
      ),
      adds: ["L1", "CV1", "OIL"], lidDrop: 0, view: "iso", lightOn: true,
      check: bi("imagem nítida a 1000x e nenhum óleo na caixa", "1000x 图像清晰，盒内无油", "sharp image at 1000x and no oil in the box"),
      warn: bi("Limpe a objetiva e a lamínula com papel de lente e álcool isopropílico depois de cada uso.", "每次使用后用擦镜纸和异丙醇清洁物镜和盖玻片。", "Clean the objective and the cover glass with lens paper and isopropyl alcohol after each use."),
      minutes: 15,
    },
  ];
  return list.map((s, i) => ({ n: i + 1, ...s }));
}

export function partsUpToStep1000x(n: number): Set<string> {
  const out = new Set<string>();
  for (const s of steps1000x().slice(0, n)) s.adds.forEach((id) => out.add(id));
  return out;
}

export function files1000x(): { file: string; text: Bilingual }[] {
  const dir = "mecanica/v2-1000x";
  return [
    { file: `${dir}/suporte-base-coluna-impressao.stl`, text: bi("M1 suporte, na orientação de impressão", "M1 支架（打印方向）", "M1 support, in the print orientation") },
    { file: `${dir}/suporte-base-coluna.stl`, text: bi("M1 suporte, na posição de montagem", "M1 支架（装配位置）", "M1 support, in the assembly position") },
    { file: `${dir}/abracadeira-tubo-impressao.stl`, text: bi("M2 abraçadeira, na orientação de impressão (mais alta que a da 400x)", "M2 抱箍（打印方向；比 400x 版更高）", "M2 clamp, in the print orientation (higher than the 400x one)") },
    { file: `${dir}/tampa-fundo.stl`, text: bi("M3 tampa de fundo, com 12 furos de ventilação", "M3 底盖，带 12 个通风孔", "M3 bottom lid, with 12 air holes") },
    { file: "mecanica/comum/difusor.stl", text: bi("M4 difusor", "M4 扩散片", "M4 diffuser") },
    { file: `${dir}/tubo-de-luz.stl`, text: bi("M5 tubo de luz com pino da roda e fenda dos fios", "M5 光管（带转盘销和走线缺口）", "M5 light tube with wheel pin and wire slot") },
    { file: `${dir}/roda-de-aberturas-impressao.stl`, text: bi("AP1 roda de aberturas, deitada", "AP1 孔径转盘（平放）", "AP1 aperture wheel, flat") },
    { file: "eletronica/v2-1000x-esquematico.svg", text: bi("Esquemático da versão 1000x", "1000x 版原理图", "Schematic of the 1000x version") },
    { file: "CUSTOS-v2-1000x-1un.csv", text: bi("Custo da versão 1000x, 1 unidade (R$, Brasil)", "1000x 版成本，1 台（巴西雷亚尔）", "Cost of the 1000x version, 1 unit (R$, Brazil)") },
    { file: "mecanica/calibracao/", text: bi("Gabaritos G1 a G3 (imprimir primeiro)", "校准件 G1~G3（请先打印）", "Jigs G1 to G3 (print them first)") },
  ];
}

const pinText = (pin: string): Bilingual => {
  const map: Record<string, Bilingual> = {
    "J1:+": bi("terminal + do conector J1", "插座 J1 的 + 端子", "+ lug of the jack J1"),
    "J1:-": bi("terminal − do conector J1", "插座 J1 的 − 端子", "− lug of the jack J1"),
    "D2:A": bi("ânodo do D2 (lado sem faixa)", "D2 阳极（无色环端）", "anode of D2 (end without the band)"),
    "D2:K": bi("cátodo do D2 (lado da faixa)", "D2 阴极（色环端）", "cathode of D2 (banded end)"),
    "SW1:1": bi("terminal 1 da chave SW1", "开关 SW1 端子 1", "terminal 1 of the switch SW1"),
    "SW1:2": bi("terminal 2 da chave SW1", "开关 SW1 端子 2", "terminal 2 of the switch SW1"),
    "DR1:IN+": bi("entrada IN+ do driver DR1", "驱动 DR1 的 IN+ 输入", "input IN+ of the driver DR1"),
    "DR1:IN-": bi("entrada IN− do driver DR1", "驱动 DR1 的 IN− 输入", "input IN− of the driver DR1"),
    "DR1:LED+": bi("saída LED+ do driver DR1", "驱动 DR1 的 LED+ 输出", "output LED+ of the driver DR1"),
    "DR1:LED-": bi("saída LED− do driver DR1", "驱动 DR1 的 LED− 输出", "output LED− of the driver DR1"),
    "D1:+": bi("pad + do LED D1 (vermelho)", "LED D1 的 + 焊盘（红）", "pad + of the LED D1 (red)"),
    "D1:-": bi("pad − do LED D1 (azul)", "LED D1 的 − 焊盘（蓝）", "pad − of the LED D1 (blue)"),
  };
  return map[pin] ?? bi(pin, pin, pin);
};
export const pin1000x = pinText;

/** Order of soldering. */
export function wiringOrder1000x(): Bilingual[] {
  return [
    bi("Solde F4 (amarelo) no pad + e F5 (azul) no pad − da estrela do LED, passando pela fenda do pé do tubo de luz.", "把 F4（黄）焊到 LED 基板的 + 焊盘，F5（蓝）焊到 − 焊盘，导线穿过光管底部缺口。", "Solder F4 (yellow) to the + pad and F5 (blue) to the − pad of the LED star, going through the foot slot of the light tube."),
    bi("Solde o ânodo do D2 (lado sem faixa) direto no terminal + do conector J1.", "把 D2 阳极（无色环端）直接焊到插座 J1 的 + 端子。", "Solder the anode of D2 (the end without the band) straight to the + lug of the jack J1."),
    bi("Solde F1 (vermelho) no cátodo do D2 e no terminal 1 da chave SW1.", "把 F1（红）焊到 D2 阴极和开关 SW1 的端子 1。", "Solder F1 (red) to the cathode of D2 and to terminal 1 of the switch SW1."),
    bi("Solde F2 (laranja) no terminal 2 da chave e na entrada IN+ do driver.", "把 F2（橙）焊到开关端子 2 和驱动 IN+ 输入。", "Solder F2 (orange) to terminal 2 of the switch and to the input IN+ of the driver."),
    bi("Solde F3 (preto) no terminal − do J1 e na entrada IN− do driver.", "把 F3（黑）焊到 J1 的 − 端子和驱动 IN− 输入。", "Solder F3 (black) to the − lug of J1 and to the input IN− of the driver."),
    bi("Solde as outras pontas de F4 e F5 nas saídas LED+ e LED− do driver.", "把 F4、F5 的另一端焊到驱动的 LED+ 和 LED− 输出。", "Solder the other ends of F4 and F5 to the outputs LED+ and LED− of the driver."),
    bi("Proteja cada emenda com um pedaço de termorretrátil de 1 cm e confira que nenhum fio toca o dissipador.", "每个焊点套 1 cm 热缩管，并确认没有导线碰到散热片。", "Protect every joint with a 1 cm piece of heat-shrink and check that no wire touches the heatsink."),
  ];
}

export function netList1000x(): Bilingual[] {
  return NETS_1000X.map((n) => {
    const names = n.pins.map(pinText);
    return bi(`${n.name}: ${names.map((x) => x.pt).join(" = ")}`, `${n.name}：${names.map((x) => x.zh).join(" = ")}`, `${n.name}: ${names.map((x) => x.en).join(" = ")}`);
  });
}

export interface TestRow1000 {
  point: Bilingual;
  expected: string;
  range: string;
  hint: Bilingual;
}

export function testPlan1000x(): TestRow1000[] {
  return [
    { point: bi("Fonte no J1: positivo para negativo, sem carga", "J1 处电源：正极对负极，空载", "Supply at J1: positive to negative, no load"), expected: "12,0 V", range: "11,5 a 15,0 V", hint: bi("Fonte fraca (abaixo de 11,5 V) ou sem regulação (até 15 V vazia): troque a fonte.", "电源偏弱（低于 11.5 V）或无稳压（空载可达 15 V）：请更换电源。", "Weak adapter (under 11.5 V) or unregulated (up to 15 V unloaded): change the adapter.") },
    { point: bi("Cátodo do D2 para GND, com a chave aberta", "D2 阴极对地，开关断开", "Cathode of D2 to GND, switch open"), expected: "leitura 1 − 0,1 a 0,6 V", range: "11,0 a 12,3 V", hint: bi("0 V: D2 ao contrário ou solda fria no J1; queda acima de 0,6 V: diodo errado.", "0 V：D2 接反或 J1 冷焊；压降超过 0.6 V：二极管型号不对。", "0 V: D2 reversed or a cold joint on J1; a drop over 0.6 V: wrong diode.") },
    { point: bi("Entrada IN+ do driver para GND, com a chave ligada", "开关闭合时驱动 IN+ 对地", "Driver input IN+ to GND, switch on"), expected: "igual à leitura 2 (± 0,2 V)", range: "10,8 a 12,3 V", hint: bi("Chave sem contato ou solda fria nos fios F1 e F2.", "开关接触不良或 F1、F2 冷焊。", "Switch without contact or a cold joint on wires F1 and F2.") },
    { point: bi("Tensão sobre o LED: LED+ para LED−", "LED 两端电压：LED+ 对 LED−", "Voltage across the LED: LED+ to LED−"), expected: "3,2 V", range: "3,0 a 3,6 V", hint: bi("0 V ou igual à entrada: LED invertido ou aberto; acima de 3,6 V: driver sem limitar a corrente.", "0 V 或等于输入电压：LED 接反或开路；高于 3.6 V：驱动未限流。", "0 V or equal to the input: LED reversed or open; over 3.6 V: the driver is not limiting the current.") },
    { point: bi("Corrente do LED, multímetro em série na entrada de 10 A", "LED 电流，万用表 10 A 档串联", "LED current, multimeter in series on the 10 A input"), expected: "350 mA", range: "330 a 370 mA", hint: bi("Acima de 370 mA: driver de 700 mA ou mal ajustado, desligue; abaixo de 330 mA: driver ajustado errado ou fonte fraca.", "高于 370 mA：驱动为 700 mA 或调整不当，请断电；低于 330 mA：驱动设置错误或电源偏弱。", "Over 370 mA: a 700 mA driver or badly set, switch off; under 330 mA: driver set wrong or weak adapter.") },
    { point: bi("Temperatura do dissipador depois de 30 minutos acesos, tampa fechada", "盖板合上、点亮 30 分钟后的散热片温度", "Heatsink temperature after 30 minutes lit, lid closed"), expected: "até 50 °C", range: "até 50 °C", hint: bi("Acima de 55 °C o PLA da caixa amolece: reduza a corrente, ventile mais ou imprima em PETG.", "超过 55 °C 盒体 PLA 会变软：降低电流、加强通风或改用 PETG 打印。", "Over 55 °C the PLA of the box softens: reduce the current, ventilate more or print in PETG.") },
  ];
}

export function calibration1000x(): Bilingual[] {
  return [
    bi("Meça e anote na ficha abaixo cada peça marcada \"suposto\": objetiva (diâmetro e comprimento do ombro à ponta), estrela do LED, dissipador, driver, lamínula (micrômetro).", "在下表中记录每个标注“suposto（假设）”的零件实测值：物镜（直径及肩部到前端长度）、LED 基板、散热片、驱动、盖玻片（千分尺）。", "Measure and note in the sheet below every part marked \"suposto\": objective (diameter and length from the shoulder to the tip), LED star, heatsink, driver, cover glass (micrometer)."),
    bi("Altura: a objetiva 100x define a altura do suporte (parâmetros objectiveLength e workingDistance). Se o ombro à ponta for diferente de 44,8 mm, refaça o M1 e o M2 com o valor medido.", "高度：100x 物镜决定支架高度（参数 objectiveLength 和 workingDistance）。若肩部到前端不是 44.8 mm，请按实测值重做 M1 和 M2。", "Height: the 100x objective sets the height of the support (parameters objectiveLength and workingDistance). If the shoulder-to-tip length is not 44.8 mm, remake M1 and M2 with the measured value."),
    bi("Foco: lâmina com lamínula de 0,17 mm, uma gota de óleo de cerca de 5 mm, roda de aberturas em 24 mm; desça o tubo interno devagar até o óleo tocar a objetiva e foque girando o tubo.", "对焦：载玻片加 0.17 mm 盖玻片，滴约 5 mm 一滴油，转盘置于 24 mm；缓慢下降内镜筒直到油接触物镜，转动镜筒对焦。", "Focus: slide with a 0.17 mm cover glass, one drop of oil of about 5 mm, aperture wheel at 24 mm; lower the inner tube slowly until the oil touches the objective and focus by turning the tube."),
    bi("Aberturas: 24 mm dá a luz máxima; 10 e 5 mm aumentam o contraste; 2 mm só para ver bordas. A roda não substitui um condensador: se o contraste não servir, o condensador de Abbe entra depois, sem refazer o suporte.", "孔径：24 mm 光线最强；10 和 5 mm 提高对比度；2 mm 仅用于观察边缘。转盘不能代替聚光镜：若对比度不够，可再加阿贝聚光镜，无需重做支架。", "Apertures: 24 mm gives the most light; 10 and 5 mm raise the contrast; 2 mm only to see edges. The wheel does not replace a condenser: if the contrast is not enough, an Abbe condenser can be added later without remaking the support."),
    bi("Limpeza: depois de cada uso, papel de lente e álcool isopropílico na objetiva e na lamínula.", "清洁：每次使用后，用擦镜纸和异丙醇清洁物镜和盖玻片。", "Cleaning: after each use, lens paper and isopropyl alcohol on the objective and the cover glass."),
  ];
}

export function measuresToTake1000x() {
  return componentes1000x().filter((c) => c.evidence === "suposto");
}

export { ECONOMICA_1000X_PARAMS, holderLayout, wireCutList1000x };

/** Schematic of the light of the 1000x version, as an SVG (blocks and the five wires). */
export function esquematico1000x(): string {
  const wire = (id: string) => WIRES_1000X.find((w) => w.id === id)!.color;
  const box = (x: number, y: number, w: number, h: number, label: string, sub = "") =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#f4f6f9" stroke="#222" stroke-width="1.5"/><text x="${x + w / 2}" y="${y + 20}" text-anchor="middle" font-size="14" font-weight="700">${label}</text>${sub ? `<text x="${x + w / 2}" y="${y + 37}" text-anchor="middle" font-size="10" fill="#444">${sub}</text>` : ""}`;
  const line = (x1: number, y1: number, x2: number, y2: number, color: string, label = "") =>
    `<polyline points="${x1},${y1} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="2.4"/>${label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 5}" text-anchor="middle" font-size="11" fill="${color === "#222222" ? "#222" : color}">${label}</text>` : ""}`;
  const dot = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#222"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 270" font-family="Arial, Helvetica, sans-serif">
<rect width="760" height="270" fill="#fff"/>
<text x="380" y="20" text-anchor="middle" font-size="14" font-weight="700">1000x · PS1 12 V → J1 → D2 → SW1 → DR1 (350 mA) → D1 (LED 3 W)</text>
${box(14, 56, 86, 64, "J1", "conector P4")}
${box(150, 56, 76, 64, "D2", "1N5819")}
${box(270, 56, 76, 64, "SW1", "chave")}
${box(400, 40, 150, 120, "DR1", "driver 350 mA")}
${box(610, 56, 120, 64, "D1", "LED 3 W + dissipador")}
<text x="14" y="52" font-size="11">+</text><text x="14" y="190" font-size="11">−</text>
${line(100, 78, 150, 78, "#d92d20")}
<text x="125" y="72" text-anchor="middle" font-size="10">A</text>
${line(226, 78, 270, 78, wire("F1"), "F1")}
<text x="226" y="72" font-size="10">K</text>
${line(346, 78, 400, 78, wire("F2"), "F2")}
<text x="404" y="74" font-size="10" fill="#fff">IN+</text>
${line(550, 78, 610, 78, wire("F4"), "F4")}
<text x="500" y="74" font-size="10" fill="#fff">LED+</text>
${line(550, 128, 580, 128, wire("F5"), "F5")}${line(580, 128, 580, 108, wire("F5"))}${line(580, 108, 610, 108, wire("F5"))}
<text x="500" y="132" font-size="10" fill="#fff">LED−</text>
${line(60, 120, 60, 200, wire("F3"))}${line(60, 200, 430, 200, wire("F3"), "F3 (GND)")}${line(430, 200, 430, 150, wire("F3"))}
<text x="404" y="150" font-size="10" fill="#fff">IN−</text>
${dot(60, 200)}
<text x="380" y="236" text-anchor="middle" font-size="11">D2: ânodo soldado direto no terminal + do J1 (sem fio). O ânodo do D2 fica no lado sem faixa.</text>
<text x="380" y="252" text-anchor="middle" font-size="11">Cores dos fios: F1 vermelho · F2 laranja · F3 preto · F4 amarelo · F5 azul</text>
</svg>`;
}
