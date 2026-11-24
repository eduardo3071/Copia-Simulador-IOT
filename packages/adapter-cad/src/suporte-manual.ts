/**
 * Content of the construction manual: the assembly steps, the names in Chinese and English and the "master plan"
 * (the position of every part in one coordinate system). The positions come from `holderLayout` and from the real
 * driver board, so they follow the same numbers the printed parts and the Gerber files are built from.
 */
import { DEFAULT_HOLDER_PARAMS, holderLayout } from "./holder.ts";
import { bom, type SuporteVersion } from "./suporte-catalog.ts";
import { padAt } from "./suporte-wiring.ts";

/** The three languages of the manual (the name is historical: it started as Portuguese and Chinese only). */
export interface Bilingual {
  pt: string;
  zh: string;
  en: string;
}
export type Lang = "pt" | "zh" | "en";

export interface ManualStep {
  n: number;
  title: Bilingual;
  text: Bilingual;
  /** Parts that show up in this step (they stay in the picture afterwards). */
  adds: string[];
  /** Parts shown in the highlight colour although they were added earlier. */
  also?: string[];
  /** Extra gap (mm) pulling the lid and what rides on it away from the box. */
  lidDrop: number;
  view: "iso" | "lid" | "front";
  /** The phase of the build this step belongs to (electrical, lighting, box, wiring and test, pregoscope). */
  phase?: Bilingual;
  lightOn?: boolean;
  check?: Bilingual;
  minutes?: number;
  warn?: Bilingual;
}

const bi = (pt: string, zh: string, en: string): Bilingual => ({ pt, zh, en });

/** Names in Chinese, so the manufacturer's engineers can match the drawing to the parts. */
export const ZH_NAMES: Record<string, string> = {
  M1: "支架：灯箱、立柱和横臂", M2: "镜筒抱箍", M3: "底盖", M4: "扩散片",
  P1: "头部：平板和螺纹杆", P2: "外镜筒", P3: "内镜筒（伸缩）", P4: "左夹爪", P5: "右夹爪", P6: "右旋钮", P10: "左旋钮（P6 的镜像）", P9: "物镜 40x / 0.65",
  L1: "显微镜载玻片", D1: "白光 LED 5 mm（漫射型）", R1: "电阻 R1（设定电流）", C1: "陶瓷电容 100 nF", D2: "二极管 1N5819（防反接）", SW1: "摇臂开关 KCD1-101",
  BT1: "9 V 电池（6F22）及电池扣", PS1: "12 V 1 A 电源适配器", J1: "面板 DC 插座 DC-022B", U1: "LM317T 可调稳压器", RV1: "220 Ω 线性电位器（WH148 B221）", PCB1: "驱动板",
  H1: "M3 × 10 自攻螺钉", H2: "M3 × 16 自攻螺钉", H3: "M3 × 8 自攻螺钉",
  W1: "柔性导线 24 AWG", W2: "热缩管 ⌀2~3 mm", W3: "热熔胶和双面胶",
  G1: "镜筒校准件", G2: "零件校准件", G3: "电池校准件",
};

/** Names in English. */
export const EN_NAMES: Record<string, string> = {
  M1: "Support: light box, column and arm", M2: "Tube clamp", M3: "Bottom lid", M4: "Diffuser",
  P1: "Head: plate and threaded rod", P2: "Outer tube", P3: "Inner tube (telescopic)", P4: "Left jaw", P5: "Right jaw", P6: "Right knob", P10: "Left knob (mirror of P6)", P9: "Objective 40x / 0.65",
  L1: "Microscope slide", D1: "White 5 mm LED (diffused)", R1: "Resistor R1 (sets the current)", C1: "Ceramic capacitor 100 nF", D2: "Diode 1N5819 (reverse polarity)", SW1: "Rocker switch KCD1-101",
  BT1: "9 V battery (6F22) with snap clip", PS1: "12 V 1 A power adapter", J1: "Panel DC jack DC-022B", U1: "LM317T adjustable regulator", RV1: "220 Ω linear rheostat (WH148 B221)", PCB1: "Driver board",
  H1: "M3 × 10 self-tapping screw", H2: "M3 × 16 self-tapping screw", H3: "M3 × 8 self-tapping screw",
  W1: "Flexible wire 24 AWG", W2: "Heat-shrink tube ⌀2-3 mm", W3: "Hot glue and double-sided tape",
  G1: "Tube calibration jig", G2: "Parts calibration jig", G3: "Battery calibration jig",
};

/** Catalogue sizes of the purchased parts, the numbers the drawing is dimensioned with. */
export const STANDARD_SIZE: Record<string, Bilingual> = {
  D1: bi("⌀ 5,0 mm; flange ⌀ 5,8 mm; altura ≈ 8,6 mm; passo das pernas 2,54 mm", "⌀5.0 mm；法兰 ⌀5.8 mm；高度约 8.6 mm；引脚间距 2.54 mm", "⌀ 5.0 mm; flange ⌀ 5.8 mm; height ≈ 8.6 mm; lead pitch 2.54 mm"),
  R1: bi("¼ W axial: corpo ≈ 6,3 × 2,3 mm; fio ⌀ 0,5 mm; passo 10 mm", "¼ W 轴向：本体约 6.3 × 2.3 mm；引线 ⌀0.5 mm；间距 10 mm", "¼ W axial: body ≈ 6.3 × 2.3 mm; lead ⌀ 0.5 mm; pitch 10 mm"),
  C1: bi("cerâmico 100 nF (104) 50 V; passo 5 mm", "陶瓷电容 100 nF (104) 50 V；引脚间距 5 mm", "ceramic 100 nF (104) 50 V; pitch 5 mm"),
  D2: bi("DO-41: corpo ≈ 5,2 × 2,7 mm; fio ⌀ 0,8 mm; faixa = cátodo", "DO-41：本体约 5.2 × 2.7 mm；引线 ⌀0.8 mm；色环端为阴极", "DO-41: body ≈ 5.2 × 2.7 mm; lead ⌀ 0.8 mm; band = cathode"),
  U1: bi("TO-220: 10,0 × 4,5 × 15,0 mm; pinos ADJ-OUT-IN, passo 2,54 mm", "TO-220：10.0 × 4.5 × 15.0 mm；引脚 ADJ-OUT-IN，间距 2.54 mm", "TO-220: 10.0 × 4.5 × 15.0 mm; pins ADJ-OUT-IN, pitch 2.54 mm"),
  SW1: bi("recorte de painel 21,2 × 15,0 mm; 2 terminais", "面板开孔 21.2 × 15.0 mm；2 个接线端", "panel cut-out 21.2 × 15.0 mm; 2 terminals"),
  BT1: bi("6F22: 48,5 × 26,5 × 17,5 mm", "6F22：48.5 × 26.5 × 17.5 mm", "6F22: 48.5 × 26.5 × 17.5 mm"),
  PS1: bi("12 V 1 A (a mesma da 1000x; a 400x usa só 18 mA); plugue P4 5,5 × 2,1 mm, centro positivo", "12 V 1 A（与 1000x 相同；400x 只用 18 mA）；P4 插头 5.5 × 2.1 mm，中心为正极", "12 V 1 A (same as the 1000x; the 400x draws only 18 mA); P4 plug 5.5 × 2.1 mm, centre positive"),
  J1: bi("DC-022B: furo de painel ⌀ 7,8 mm; plugue 5,5 × 2,1 mm", "DC-022B：面板孔 ⌀7.8 mm；插头 5.5 × 2.1 mm", "DC-022B: panel hole ⌀ 7.8 mm; plug 5.5 × 2.1 mm"),
  RV1: bi("WH148: eixo ⌀ 6 mm; rosca M7; furo ⌀ 7,5 mm", "WH148：轴 ⌀6 mm；M7 螺纹；开孔 ⌀7.5 mm", "WH148: shaft ⌀ 6 mm; M7 thread; hole ⌀ 7.5 mm"),
  PCB1: bi("1,6 mm de espessura; furos M3 a 3,5 mm das bordas", "板厚 1.6 mm；M3 安装孔距边缘 3.5 mm", "1.6 mm thick; M3 holes 3.5 mm from the edges"),
  L1: bi("76 × 26 × 1 mm (padrão de microscopia)", "76 × 26 × 1 mm（显微镜标准）", "76 × 26 × 1 mm (microscopy standard)"),
  H1: bi("M3 × 10; cabeça panela ⌀ ≈ 5,6 mm", "M3 × 10；圆头 ⌀约 5.6 mm", "M3 × 10; pan head ⌀ ≈ 5.6 mm"),
  H2: bi("M3 × 16; cabeça panela ⌀ ≈ 5,6 mm", "M3 × 16；圆头 ⌀约 5.6 mm", "M3 × 16; pan head ⌀ ≈ 5.6 mm"),
  H3: bi("M3 × 8; cabeça panela ⌀ ≈ 5,6 mm", "M3 × 8；圆头 ⌀约 5.6 mm", "M3 × 8; pan head ⌀ ≈ 5.6 mm"),
  W1: bi("24 AWG: condutor ⌀ 0,51 mm; isolação ⌀ ≈ 1,4 mm", "24 AWG：导体 ⌀0.51 mm；绝缘外径约 1.4 mm", "24 AWG: conductor ⌀ 0.51 mm; insulation ⌀ ≈ 1.4 mm"),
  W2: bi("⌀ 2 a 3 mm antes de encolher; luvas de 10 mm", "收缩前 ⌀2~3 mm；每段 10 mm", "⌀ 2 to 3 mm before shrinking; 10 mm pieces"),
  W3: bi("bastão de cola ⌀ 7 mm; fita dupla face de 12 mm", "热熔胶棒 ⌀7 mm；12 mm 双面胶", "glue stick ⌀ 7 mm; 12 mm double-sided tape"),
  P9: bi("objetiva 40x / 0,65 (160/0,17, rosca RMS), ⌀ 20 mm, 38 mm de comprimento (35 mm abaixo do tubo interno)", "40x / 0.65 物镜（160/0.17，RMS 螺纹），⌀20 mm，长 38 mm（内镜筒下方露出 35 mm）", "objective 40x / 0.65 (160/0.17, RMS thread), ⌀ 20 mm, 38 mm long (35 mm below the inner tube)"),
  P3: bi("tubo ⌀ 22,5 mm, sai até 40 mm, escala impressa em mm", "镜筒 ⌀22.5 mm，最多伸出 40 mm，印有毫米刻度", "tube ⌀ 22.5 mm, pulls out up to 40 mm, printed mm scale"),
  P2: bi("tubo ⌀ 33,5 mm × 115 mm (medido)", "镜筒 ⌀33.5 mm × 115 mm（实测）", "tube ⌀ 33.5 mm × 115 mm (measured)"),
};

export interface PlacedPart {
  id: string;
  /** Centre of the part in the master frame (mm). */
  x: number;
  y: number;
  z: number;
  /** Bounding size along x, y and z. */
  size: [number, number, number];
  mount: Bilingual;
  /** Where the part sits for the views: inside the closed box (drawn dashed) or outside. */
  hidden: boolean;
}

const round = (n: number) => Math.round(n * 10) / 10;
/** Y of the clamp screws (heads on the front face of the ears), as drawn in the 3D scene. */
const EAR_SCREW_Y = -12.8;

/**
 * The master plan: every part with a place in one frame. Origin on the tube axis, z = 0 at the top face of the lid
 * (the floor of the light box), +z up, +x to the right seen from the front, +y toward the column.
 */
export function masterPlan(version: SuporteVersion): PlacedPart[] {
  const layout = holderLayout({ ...DEFAULT_HOLDER_PARAMS, variant: version === "v1" ? "pilha" : "fonte" });
  const { box, board, ring, tube, ledPost, params: p } = layout;
  const bx = (board.xMin + board.xMax) / 2;
  const by = (board.yMin + board.yMax) / 2;
  const bw = board.xMax - board.xMin;
  const top = board.standoffHeight + 1.6;
  const swZ = box.height / 2;
  const mid = (a: string, b: string): [number, number] => {
    const q = padAt(version, a);
    const r = padAt(version, b);
    return [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2];
  };
  const u1 = padAt(version, "U1.OUT");
  const r1 = mid("R1.pin1", "R1.pin2");
  const c1 = mid("C1.pin1", "C1.pin2");
  const put = (id: string, x: number, y: number, z: number, size: [number, number, number], mount: Bilingual, hidden = false): PlacedPart => ({
    id, x: round(x), y: round(y), z: round(z), size: size.map(round) as [number, number, number], mount, hidden,
  });
  const parts: PlacedPart[] = [
    put("M1", 0, (box.yMin + box.yMax) / 2, layout.totalHeight / 2, [box.xMax - box.xMin, box.yMax - box.yMin, layout.totalHeight], bi("apoiado na mesa", "放置于桌面", "standing on the table")),
    put("M3", 0, (box.yMin + box.yMax) / 2, -p.wall / 2, [box.xMax - box.xMin, box.yMax - box.yMin, p.wall], bi("4 parafusos H1 nos cantos", "四角 4 颗 H1 螺钉", "4 screws H1 at the corners"), true),
    put("M4", 0, 0, layout.cavity.top + 0.6, [p.diffuserDiameter, p.diffuserDiameter, p.diffuserThickness], bi("cola quente (W3) no encaixe do teto", "用热熔胶（W3）粘在顶部凹槽", "hot glue (W3) in the ceiling seat"), true),
    put("M2", 0, -(ring.outerRadius + ring.gap) / 2, (ring.bottom + ring.top) / 2, [2 * (layout.ears[1]!.x + layout.ears[1]!.width / 2), ring.outerRadius - ring.gap, ring.top - ring.bottom], bi("2 parafusos H2 nas orelhas", "耳部 2 颗 H2 螺钉", "2 screws H2 in the ears")),
    put("L1", 0, 0, layout.samplePlane - 0.5, [76, 26, 1], bi("deslizada no canal, de lado", "从侧面滑入槽道", "slid into the channel from the side")),
    put("D1", ledPost.x, ledPost.y, ledPost.ledTop - 4.3, [5.8, 5.8, 8.6], bi("sede do porta-LED da tampa", "插入盖板 LED 座", "seat of the LED post on the lid"), true),
    put("PCB1", bx, by, board.standoffHeight + 0.8, [bw, board.yMax - board.yMin, 1.6], bi("4 parafusos H3 nos suportes de 6 mm", "4 颗 H3 螺钉固定在 6 mm 立柱上", "4 screws H3 on the 6 mm standoffs"), true),
    put("U1", u1[0], u1[1], top + 3 + 7.75, [10, 4.5, 15.5], bi("soldado na PCB1, aleta para fora", "焊在 PCB1 上，散热片朝外", "soldered to PCB1, tab facing back"), true),
    put("R1", r1[0], r1[1], top + 1.4, [6.3, 2.3, 2.3], bi("soldado na PCB1", "焊在 PCB1 上", "soldered to PCB1"), true),
    put("C1", c1[0], c1[1], top + 3.5, [5, 2.6, 5.4], bi("soldado na PCB1, perto do U1", "焊在 PCB1 上，靠近 U1", "soldered to PCB1, next to U1"), true),
    put("SW1", p.switchCutout.x, box.yMin + p.wall / 2, swZ, [p.switchCutout.width, 10, p.switchCutout.height], bi("recorte da parede frontal, travas a pressão", "前壁开孔，卡扣固定", "front-wall cut-out, snap tabs")),
    put("H1", 0, 0, -p.wall / 2, [5.6, 5.6, 2], bi("4 furos da tampa (ver tabela abaixo)", "盖板 4 孔（见下表）", "4 lid holes (see the table below)"), true),
    put("H2", 0, EAR_SCREW_Y, (ring.bottom + ring.top) / 2, [2 * 24.4 + 5.6, 16, 5.6], bi("2 orelhas da abraçadeira, eixo Y (ver tabela abaixo)", "抱箍 2 个耳部，沿 Y 轴（见下表）", "2 clamp ears, Y axis (see the table below)")),
    put("H3", bx, by, board.standoffHeight + 1.6, [5.6, 5.6, 2], bi("4 furos da PCB1 (ver tabela abaixo)", "PCB1 4 孔（见下表）", "4 PCB1 holes (see the table below)"), true),
    put("W1", ledPost.x, ledPost.y + 8 * ledPost.slot.dir, 8, [3, 20, 3], bi("do LED à PCB1 pela fenda lateral do porta-LED", "从 LED 经座侧面开槽到 PCB1", "from the LED to PCB1 through the side slot of the LED post"), true),
    put("W2", ledPost.x, ledPost.y + 8 * ledPost.slot.dir, 3, [3, 10, 3], bi("sobre as duas soldas do LED", "套在 LED 的两个焊点上", "over the two LED solder joints"), true),
    put("W3", 0, 0, layout.cavity.top + 0.4, [p.diffuserDiameter, p.diffuserDiameter, 1], bi("cordão na borda do difusor", "扩散片边缘的胶圈", "bead around the diffuser edge"), true),
    put("P9", 0, 0, tube.noseZ + p.objectiveLength / 2, [p.objectiveDiameter, p.objectiveDiameter, p.objectiveLength], bi("rosqueada no tubo interno do pregoscópio", "旋在显微镜内镜筒上", "screwed to the inner tube of the pregoscope")),
    put("P2", 0, 0, (tube.bottom + tube.top) / 2, [p.tubeDiameter, p.tubeDiameter, tube.top - tube.bottom], bi("no anel da coluna, preso pela M2", "放入立柱环，由 M2 夹紧", "in the column ring, held by M2")),
    put("P1", 0, 0, tube.top + 7.5, [50, 50, 15], bi("apoiada no topo do anel", "放在环的顶部", "resting on top of the ring")),
  ];
  if (version === "v1") {
    parts.push(put("BT1", 0, p.batteryY, 8.75, [p.batteryLength, p.batteryWidth, 17.5], bi("berço da tampa, clipe voltado para o lado esquerdo", "盖板电池仓，电池扣朝左", "lid cradle, snap clip toward the left"), true));
  } else {
    const d2 = mid("D2.pin1", "D2.pin2");
    parts.push(
      put("J1", box.xMax - p.wall / 2, p.jackY, swZ, [p.wall + 10, p.jackDiameter, p.jackDiameter], bi("furo da parede direita, porca por fora", "右壁开孔，螺母在外侧", "right-wall hole, nut outside")),
      put("RV1", p.knobX, box.yMin + p.wall / 2, swZ, [14, 8, 14], bi("furo da parede frontal, porca por fora", "前壁开孔，螺母在外侧", "front-wall hole, nut outside")),
      put("D2", d2[0], d2[1], top + 1.6, [5.2, 2.7, 2.7], bi("soldado na PCB1, faixa para o lado do pad pin2", "焊在 PCB1 上，色环端朝向 pin2 焊盘", "soldered to PCB1, band toward the pin2 pad"), true),
      put("PS1", box.xMax + 40, 0, swZ, [38, 26, 24], bi("fora da caixa, cabo ao conector J1", "位于盒外，电缆接插座 J1", "outside the box, cable to the jack J1")),
    );
  }
  return parts;
}

/** Screw positions that the table of the master plan lists one by one. */
export function screwPositions(version: SuporteVersion): { id: string; x: number; y: number; z: number }[] {
  const layout = holderLayout({ ...DEFAULT_HOLDER_PARAMS, variant: version === "v1" ? "pilha" : "fonte" });
  const out: { id: string; x: number; y: number; z: number }[] = [];
  layout.lid.holes.forEach((h) => out.push({ id: "H1", x: round(h.x), y: round(h.y), z: -layout.params.wall }));
  layout.boardPosts.forEach((b) => out.push({ id: "H3", x: round(b.x), y: round(b.y), z: round(b.top) }));
  layout.ears.forEach((e) => out.push({ id: "H2", x: round(e.x), y: EAR_SCREW_Y, z: round(e.z) }));
  return out;
}

/** The previous order of the steps (box first, then the lid). Only its Chinese texts are still used, until they are revised for the new order. */
function previousOrder(version: SuporteVersion): ManualStep[] {
  const v1 = version === "v1";
  const steps: Omit<ManualStep, "n">[] = [
    {
      title: bi("Preparar a caixa (M1)", "准备灯箱 (M1)", "Prepare the box (M1)"),
      text: bi(
        "Retire o suporte de impressão e limpe todos os furos com uma broca de 3 mm. Passe lixa fina nas bordas do canal da lâmina e confira que não ficou nenhum resto dentro da caixa.",
        "去除打印支撑，用 3 mm 钻头清理所有孔。用细砂纸打磨载玻片槽道边缘，并确认盒内没有残留碎屑。",
        "Remove the print supports and clean every hole with a 3 mm drill bit. Sand the edges of the slide channel lightly and make sure no debris is left inside the box.",
      ),
      adds: ["M1"], lidDrop: 0, view: "iso",
      check: bi("O canal da lâmina deve estar liso e limpo.", "载玻片槽道应光滑干净。", "The slide channel must be smooth and clean."),
    },
    {
      title: bi("Colar o difusor (M4)", "粘贴扩散片 (M4)", "Glue the diffuser (M4)"),
      text: bi(
        "Coloque o disco M4 (⌀ 26 × 0,8 mm) no encaixe do teto da caixa, por dentro. Prenda com um cordão fino de cola quente (W3) na borda, sem cobrir a janela de ⌀ 24 mm.",
        "将扩散片 M4（⌀26 × 0.8 mm）从盒内放入顶部凹槽，沿边缘涂一圈细热熔胶（W3），不要盖住 ⌀24 mm 的光窗。",
        "Place the disc M4 (⌀ 26 × 0.8 mm) in the ceiling seat from inside the box. Fix it with a thin bead of hot glue (W3) around the edge, without covering the ⌀ 24 mm window.",
      ),
      adds: ["M4", "W3"], lidDrop: 0, view: "iso",
    },
    {
      title: bi("Provar a lâmina (L1)", "试装载玻片 (L1)", "Test-fit the slide (L1)"),
      text: bi(
        "Deslize a lâmina L1 (76 × 26 × 1 mm) pelo canal. Ela deve entrar e sair sem esforço e sem folga lateral visível. Se prender, use o gabarito G2 para escolher o furo certo antes de imprimir de novo.",
        "将载玻片 L1（76 × 26 × 1 mm）滑入槽道，应顺畅进出且侧向无明显间隙。若过紧，请先用校准件 G2 确定尺寸再重新打印。",
        "Slide the slide L1 (76 × 26 × 1 mm) through the channel. It must go in and out without effort and without visible side play. If it sticks, use jig G2 to pick the right size before printing again.",
      ),
      adds: ["L1"], lidDrop: 0, view: "iso",
      check: bi("A lâmina entra pelo lado e fica a 40,4 mm acima do piso.", "载玻片从侧面进入，距底面 40.4 mm。", "The slide enters from the side and sits 40.4 mm above the floor."),
    },
    {
      title: bi("Instalar o interruptor (SW1)", "安装开关 (SW1)", "Install the switch (SW1)"),
      text: bi(
        "Empurre o interruptor KCD1-101 de fora para dentro no recorte de 21,2 × 15,0 mm da parede frontal, até as travas estalarem. Os dois terminais ficam dentro da caixa.",
        "将 KCD1-101 摇臂开关从前壁外侧推入 21.2 × 15.0 mm 开孔，直至卡扣弹出。两个接线端位于盒内。",
        "Push the KCD1-101 switch from outside into the 21.2 × 15.0 mm cut-out of the front wall until the tabs click. The two terminals end up inside the box.",
      ),
      adds: ["SW1"], lidDrop: 0, view: "iso",
    },
  ];
  if (!v1) {
    steps.push(
      {
        title: bi("Instalar o conector de força (J1)", "安装电源插座 (J1)", "Install the power jack (J1)"),
        text: bi(
          "Passe o conector DC-022B por dentro, no furo de ⌀ 7,8 mm da parede direita, e aperte a porca por fora com os dedos. Se o furo ficar folgado ou apertado, confira o gabarito G2.",
          "将 DC-022B 插座从盒内穿过右壁 ⌀7.8 mm 孔，在外侧用手拧紧螺母。若孔过松或过紧，请核对校准件 G2。",
          "Pass the DC-022B jack from inside through the ⌀ 7.8 mm hole of the right wall and tighten the nut by hand outside. If the hole is loose or tight, check jig G2.",
        ),
        adds: ["J1"], lidDrop: 0, view: "iso",
      },
      {
        title: bi("Instalar o reostato (RV1)", "安装电位器 (RV1)", "Install the rheostat (RV1)"),
        text: bi(
          "Passe o eixo do reostato de 220 Ω pelo furo de ⌀ 7,5 mm da parede frontal, por dentro. Aperte a porca por fora e encaixe o botão.",
          "将 220 Ω 电位器轴从盒内穿过前壁 ⌀7.5 mm 孔，在外侧拧紧螺母并装上旋钮。",
          "Pass the shaft of the 220 Ω rheostat through the ⌀ 7.5 mm hole of the front wall from inside. Tighten the nut outside and fit the knob.",
        ),
        adds: ["RV1"], lidDrop: 0, view: "iso",
      },
    );
  }
  steps.push(
    {
      title: bi("Tampa: montar o LED (M3, D1)", "底盖：安装 LED (M3, D1)", "Lid: mount the LED (M3, D1)"),
      text: bi(
        "Solde dois fios (W1) nas pernas do LED: laranja na perna longa (ânodo), preto na curta (cátodo). Isole cada solda com termorretrátil (W2). Encaixe o LED na sede do porta-LED da tampa M3. Os fios descem pelo furo do porta-LED e saem pela fenda lateral, voltada para a placa.",
        "将两根导线（W1）焊到 LED 引脚：橙色接长脚（阳极），黑色接短脚（阴极）。每个焊点套上热缩管（W2）。把 LED 装入底盖 M3 的 LED 座，导线沿座内孔向下，从侧面开槽引出，朝向驱动板。",
        "Solder two wires (W1) to the LED legs: orange to the long leg (anode), black to the short one (cathode). Insulate each joint with heat-shrink (W2). Seat the LED in the LED post of lid M3. The wires go down the hole of the post and leave through the side slot, which faces the board.",
      ),
      adds: ["M3", "D1", "W1", "W2"], lidDrop: 60, view: "lid", lightOn: false,
      check: bi("Perna longa = ânodo (+). A tampa não tem furo para fora.", "长脚为阳极 (+)。盖板底部没有通孔。", "Long leg = anode (+). The lid has no hole through to the outside."),
    },
    {
      title: bi(v1 ? "Tampa: placa do driver (PCB1, U1, R1, C1)" : "Tampa: placa do driver (PCB1, U1, R1, C1, D2)", v1 ? "底盖：驱动板 (PCB1, U1, R1, C1)" : "底盖：驱动板 (PCB1, U1, R1, C1, D2)", v1 ? "Lid: driver board (PCB1, U1, R1, C1)" : "Lid: driver board (PCB1, U1, R1, C1, D2)"),
      text: bi(
        `Solde ${v1 ? "o regulador U1, o resistor R1 (68 Ω) e o capacitor C1 (100 nF)" : "o regulador U1, o resistor R1 (68 Ω), o capacitor C1 (100 nF) e o diodo D2 (faixa para o lado do pad pin2)"} na placa PCB1 (${v1 ? "40" : "70"} × 25 mm), nos pads do Gerber. O U1 fica com o rótulo para a frente: ADJ, OUT, IN da esquerda para a direita. Parafuse a placa nos 4 suportes da tampa com M3 × 8 (H3). Solde os fios do LED e das demais peças nos pads marcados, na ordem da seção de ligações.`,
        `按 Gerber 焊盘将${v1 ? "稳压器 U1、电阻 R1 (68 Ω) 和电容 C1 (100 nF)" : "稳压器 U1、电阻 R1 (68 Ω)、电容 C1 (100 nF) 和二极管 D2（色环端朝向 pin2 焊盘）"}焊到 PCB1（${v1 ? "40" : "70"} × 25 mm）上。U1 标签朝前，从左到右依次为 ADJ、OUT、IN。用 M3 × 8 螺钉 (H3) 把板固定在盖板的 4 个立柱上。按连接顺序一节，把 LED 和其他元件的导线焊到标记的焊盘上。`,
        `Solder ${v1 ? "the regulator U1, the resistor R1 (68 Ω) and the capacitor C1 (100 nF)" : "the regulator U1, the resistor R1 (68 Ω), the capacitor C1 (100 nF) and the diode D2 (band toward the pin2 pad)"} to PCB1 (${v1 ? "40" : "70"} × 25 mm), on the pads of the Gerber files. U1 faces forward with its label: ADJ, OUT, IN from left to right. Screw the board to the 4 standoffs of the lid with M3 × 8 (H3). Solder the wires of the LED and of the other parts to the marked pads, in the order of the wiring section.`,
      ),
      adds: ["PCB1", "U1", "R1", "C1", ...(v1 ? [] : ["D2"]), "H3"], also: ["W1"], lidDrop: 60, view: "lid", lightOn: false,
      check: bi("Aleta do U1 para trás; nenhuma solda encosta em outra.", "U1 散热片朝后；任何焊点不得相碰。", "Tab of U1 facing back; no solder joint touches another."),
    },
  );
  if (v1) {
    steps.push({
      title: bi("Tampa: pilha de 9 V (BT1)", "底盖：9 V 电池 (BT1)", "Lid: 9 V battery (BT1)"),
      text: bi(
        "Encaixe a pilha de 9 V no berço da tampa. Solde o fio vermelho do clipe no pad BT1 POS e o preto no pad BT1 NEG, e só então encaixe o clipe na pilha. Os fios do interruptor SW1 vão aos pads SW1 A e B.",
        "将 9 V 电池放入盖板电池仓。把电池扣红线焊到 BT1 POS 焊盘，黑线焊到 BT1 NEG 焊盘，然后再把电池扣扣到电池上。开关 SW1 的导线焊到 SW1 A 和 B 焊盘。",
        "Seat the 9 V battery in the cradle of the lid. Solder the red wire of the clip to the BT1 POS pad and the black one to the BT1 NEG pad, and only then snap the clip onto the battery. The wires of the switch SW1 go to the pads SW1 A and B.",
      ),
      adds: ["BT1"], also: ["W1"], lidDrop: 60, view: "lid", lightOn: false,
    });
  } else {
    steps.push({
      title: bi("Ligar os fios do painel", "连接面板导线", "Connect the panel wires"),
      text: bi(
        "Solde os fios do conector J1 (pads VIN e GND), do interruptor SW1 (pads A e B) e dos três terminais do reostato RV1 (pads pin1, pin2 e pin3), nas cores da seção de ligações (vermelho positivo, preto GND, amarelo, verde e azul para o reostato). Deixe folga para a tampa abrir.",
        "把插座 J1（VIN 和 GND 焊盘）、开关 SW1（A 和 B 焊盘）和电位器 RV1 三个端子（pin1、pin2、pin3 焊盘）的导线焊到板上，颜色见连接顺序一节（红色为正极，黑色为地，电位器用黄、绿、蓝）。预留余量以便打开盖板。",
        "Solder the wires of the jack J1 (pads VIN and GND), of the switch SW1 (pads A and B) and of the three terminals of the rheostat RV1 (pads pin1, pin2 and pin3) in the colours of the wiring section (red positive, black GND, yellow, green and blue for the rheostat). Leave slack so the lid can open.",
      ),
      adds: [], also: ["W1", "J1", "SW1", "RV1"], lidDrop: 60, view: "lid", lightOn: false,
    });
  }
  steps.push(
    {
      title: bi("Teste elétrico com o multímetro", "万用表电气测试", "Electrical test with the multimeter"),
      text: bi(
        "Antes de fechar, ligue a alimentação e siga o plano de teste da seção de teste elétrico ponto por ponto. Todas as leituras devem ficar dentro da faixa e o LED deve acender. Se uma leitura sair da faixa, pare e corrija antes de continuar.",
        "关盖前接通电源，按电气测试一节的测试计划逐点测量。所有读数应在范围内且 LED 点亮。如有读数超出范围，请先排除故障再继续。",
        "Before closing, switch the power on and follow the test plan of the electrical test section point by point. Every reading must be inside its range and the LED must light. If a reading is out of range, stop and fix it before going on.",
      ),
      adds: [], also: ["D1"], lidDrop: 60, view: "lid", lightOn: true,
      check: bi(`${v1 ? "18,4 mA" : "18,4 a 4,3 mA"} no LED`, `LED 电流 ${v1 ? "18.4 mA" : "18.4 至 4.3 mA"}`, `${v1 ? "18.4 mA" : "18.4 to 4.3 mA"} in the LED`),
    },
    {
      title: bi("Fechar a tampa (H1)", "合上底盖 (H1)", "Close the lid (H1)"),
      text: bi(
        "Suba a tampa até a caixa sem prender nenhum fio e aperte os 4 parafusos M3 × 10 (H1) nos cantos. Aperte aos poucos, em cruz, sem forçar o plástico.",
        "把底盖托到灯箱下方，确保不夹住任何导线，在四角拧入 4 颗 M3 × 10 螺钉 (H1)。分次交叉拧紧，不要过度用力。",
        "Raise the lid to the box without trapping any wire and tighten the 4 screws M3 × 10 (H1) at the corners. Tighten a little at a time, in a cross pattern, without forcing the plastic.",
      ),
      adds: ["H1"], lidDrop: 40, view: "lid", lightOn: true,
    },
    {
      title: bi("Encaixar o pregoscópio (M2, H2, P1 a P10)", "装入显微镜 (M2, H2, P1~P10)", "Fit the pregoscope (M2, H2, P1 to P10)"),
      text: bi(
        "Tire a metade removível da abraçadeira M2, encoste o tubo externo P2 no anel da coluna, recoloque a metade e aperte os 2 parafusos M3 × 16 (H2) sem forçar. A cabeça P1 apoia no topo do anel e a objetiva P9 fica sobre a janela.",
        "取下抱箍 M2 的可拆半环，将外镜筒 P2 靠入立柱环，装回半环并拧入 2 颗 M3 × 16 螺钉 (H2)，不要用力过大。头部 P1 压在环的顶面，物镜 P9 位于光窗正上方。",
        "Take off the removable half of the clamp M2, lean the outer tube P2 into the column ring, put the half back and tighten the 2 screws M3 × 16 (H2) without forcing. The head P1 rests on top of the ring and the objective P9 sits over the window.",
      ),
      adds: ["M2", "H2", "P1", "P2", "P3", "P4", "P5", "P6", "P10", "P9"], lidDrop: 0, view: "iso", lightOn: true,
    },
    {
      title: bi(v1 ? "Foco e uso" : "Ligar a fonte, foco e brilho (PS1)", v1 ? "对焦与使用" : "连接电源、对焦与亮度调节 (PS1)", v1 ? "Focus and use" : "Connect the supply, focus and brightness (PS1)"),
      text: bi(
        v1
          ? "Ligue o interruptor SW1. Afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno P3, até a lâmina ficar nítida. Foco nominal: a lente a 0,8 mm da lâmina, com o tubo interno estendido 37 mm (leia a escala impressa no tubo, na borda do tubo externo). A ponta da objetiva tem mola, mas não force contra o vidro."
          : "Ligue a fonte de 12 V (PS1) ao conector J1 e o interruptor SW1. Gire o botão RV1 para ajustar o brilho. Afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno P3, até a lâmina ficar nítida. Foco nominal: a lente a 0,8 mm da lâmina, com o tubo interno estendido 37 mm (leia a escala impressa no tubo, na borda do tubo externo). A ponta da objetiva tem mola, mas não force contra o vidro.",
        v1
          ? "打开开关 SW1。松开抱箍并滑动外镜筒，或拉出内镜筒 P3，直到载玻片图像清晰。标称对焦：镜头距载玻片 0.8 mm，内镜筒伸出 37 mm（读取镜筒上印的刻度，位于外镜筒端口处）。物镜前端带弹簧，但不要顶压玻片。"
          : "将 12 V 电源 (PS1) 接到插座 J1 并打开开关 SW1。旋转 RV1 旋钮调节亮度。松开抱箍并滑动外镜筒，或拉出内镜筒 P3，直到载玻片图像清晰。标称对焦：镜头距载玻片 0.8 mm，内镜筒伸出 37 mm（读取镜筒上印的刻度，位于外镜筒端口处）。物镜前端带弹簧，但不要顶压玻片。",
        v1
          ? "Switch SW1 on. Loosen the clamp and slide the outer tube, or pull the inner tube P3, until the slide is sharp. Nominal focus: the lens 0.8 mm from the slide, with the inner tube pulled out 37 mm (read the scale printed on the tube, at the edge of the outer tube). The tip of the objective is spring-loaded, but do not push it against the glass."
          : "Plug the 12 V supply (PS1) into the jack J1 and switch SW1 on. Turn the knob RV1 to set the brightness. Loosen the clamp and slide the outer tube, or pull the inner tube P3, until the slide is sharp. Nominal focus: the lens 0.8 mm from the slide, with the inner tube pulled out 37 mm (read the scale printed on the tube, at the edge of the outer tube). The tip of the objective is spring-loaded, but do not push it against the glass.",
      ),
      adds: v1 ? [] : ["PS1"], also: ["L1"], lidDrop: 0, view: "iso", lightOn: true,
    },
  );
  return steps.map((s, i) => ({ ...s, n: i + 1, ...extras(s.title.pt) }));
}

const WARN_HOT = bi(
  "Ferro de soldar a 300 °C: apoie-o no suporte e não toque na ponta. Solde em local ventilado.",
  "烙铁温度约 300 °C：使用后放回烙铁架，勿触碰烙铁头。请在通风处焊接。",
  "Soldering iron at 300 °C: rest it in its stand and never touch the tip. Solder in a ventilated place.",
);
const WARN_PLASTIC = bi("Não aperte demais: o PLA racha. Pare quando o parafuso encostar.", "不要拧得过紧：PLA 会开裂。螺钉贴合即停。", "Do not overtighten: PLA cracks. Stop when the screw seats.");
const WARN_POLARITY = bi(
  "Confira a polaridade antes de ligar: LED (perna longa +), diodo (faixa = cátodo), plugue de centro positivo.",
  "通电前核对极性：LED 长脚为 +，二极管色环端为阴极，插头中心为正极。",
  "Check the polarity before powering up: LED (long leg +), diode (band = cathode), plug with positive centre.",
);

/** Time and safety notes by step; matched on the Portuguese title so the step list above stays readable. */
function extras(title: string): { minutes: number; warn?: Bilingual } {
  if (title.startsWith("Preparar")) return { minutes: 20 };
  if (title.startsWith("Colar o difusor")) return { minutes: 10, warn: bi("A cola quente queima: use a ponta do bastão e deixe esfriar 1 minuto.", "热熔胶会烫伤：用胶枪头操作，冷却 1 分钟后再碰。", "Hot glue burns: use the tip of the gun and let it cool for 1 minute.") };
  if (title.startsWith("Provar")) return { minutes: 5 };
  if (title.startsWith("Instalar")) return { minutes: 5 };
  if (title.startsWith("Tampa: montar o LED")) {
    return {
      minutes: 20,
      warn: bi(`Solde por menos de 3 segundos por perna para não queimar o LED. ${WARN_HOT.pt}`, `每个引脚焊接不超过 3 秒，避免烧坏 LED。${WARN_HOT.zh}`, `Solder each leg for less than 3 seconds so the LED does not burn out. ${WARN_HOT.en}`),
    };
  }
  if (title.startsWith("Tampa: placa")) return { minutes: 40, warn: WARN_HOT };
  if (title.startsWith("Tampa: pilha")) return { minutes: 10, warn: WARN_POLARITY };
  if (title.startsWith("Ligar os fios")) return { minutes: 30, warn: WARN_HOT };
  if (title.startsWith("Teste")) return { minutes: 15, warn: WARN_POLARITY };
  if (title.startsWith("Fechar")) return { minutes: 10, warn: WARN_PLASTIC };
  if (title.startsWith("Encaixar")) return { minutes: 15, warn: WARN_PLASTIC };
  return { minutes: 10 };
}

/** The five phases of the build, in the order of the bench: electronics first, then the box, then the pregoscope. */
export const PHASES = {
  eletrica: bi("Fase 1 de 5 · Parte elétrica e placa", "第 1 阶段 / 共 5 · 电气部分与电路板", "Phase 1 of 5 · Electrical part and board"),
  luz: bi("Fase 2 de 5 · Componentes de iluminação", "第 2 阶段 / 共 5 · 照明部件", "Phase 2 of 5 · Lighting components"),
  suporte: bi("Fase 3 de 5 · Suporte (a caixa)", "第 3 阶段 / 共 5 · 支架（灯箱）", "Phase 3 of 5 · Support (the box)"),
  ligacao: bi("Fase 4 de 5 · Ligação, teste e fechamento", "第 4 阶段 / 共 5 · 接线、测试与合盖", "Phase 4 of 5 · Wiring, test and closing"),
  pregoscopio: bi("Fase 5 de 5 · Posicionar o pregoscópio", "第 5 阶段 / 共 5 · 装入显微镜", "Phase 5 of 5 · Place the pregoscope"),
};

const WARN_GLUE = bi("A cola quente queima: use a ponta do bastão e deixe esfriar 1 minuto.", "热熔胶会烫伤：用胶枪头操作，冷却 1 分钟后再碰。", "Hot glue burns: use the tip of the gun and let it cool for 1 minute.");

/**
 * The Chinese of the previous edition of a step, found by the start of its old Portuguese title. The order and the detail of the steps
 * changed after the Chinese was written, so it still has to be revised (the Portuguese and English are the current ones).
 */
function previousZh(version: SuporteVersion, prefix: string): ManualStep {
  const s = previousOrder(version).find((x) => x.title.pt.startsWith(prefix));
  if (!s) throw new Error(`passo da edição anterior sem tradução: ${prefix}`);
  return s;
}

interface Draft {
  old: string;
  phase: Bilingual;
  title: [string, string];
  text: [string, string];
  check?: [string, string];
  warn?: Bilingual;
  adds: string[];
  also?: string[];
  lidDrop: number;
  view: ManualStep["view"];
  lightOn?: boolean;
  minutes: number;
}

/** The assembly sequence of a version, in the order a person builds it: electronics, lighting, box, wiring and test, pregoscope. */
export function manualSteps(version: SuporteVersion): ManualStep[] {
  const v1 = version === "v1";
  const W = v1 ? 40 : 70;
  const d2pt = v1 ? "" : ", o diodo D2 (1N5819, com a faixa para o lado do pad pin2)";
  const d2en = v1 ? "" : ", the diode D2 (1N5819, with the band toward the pad pin2)";
  const drafts: Draft[] = [
    {
      old: "Tampa: placa", phase: PHASES.eletrica,
      title: [`Soldar a placa do driver (PCB1, U1, R1, C1${v1 ? "" : ", D2"})`, `Solder the driver board (PCB1, U1, R1, C1${v1 ? "" : ", D2"})`],
      text: [
        `Ferramentas: ferro de solda de 30 a 60 W a cerca de 300 °C, solda de 0,8 mm, alicate de corte e multímetro.\n• Apoie a placa PCB1 (${W} × 25 mm) na bancada, com a serigrafia para cima e as trilhas para baixo.\n• Solde dos componentes mais baixos para os mais altos: primeiro o resistor R1 (68 Ω: azul, cinza, preto, dourado, marrom)${d2pt}, depois o capacitor C1 (100 nF, marcado 104, sem polaridade) e por último o regulador U1 (LM317T).\n• Encaixe cada componente nos furos desenhados na serigrafia, vire a placa, aqueça o pad e a perna juntos por 2 a 3 segundos, aplique a solda e corte a sobra da perna rente à solda.\n• O U1 fica com o rótulo para a frente, na ordem ADJ, OUT, IN da esquerda para a direita, e a aleta metálica virada para trás.\n• Cada solda deve ficar brilhante e em forma de cone, sem encostar na trilha vizinha.\n• Antes de ligar qualquer coisa, ponha o multímetro em continuidade e confirme que não há curto entre IN e GND, nem entre OUT e GND.`,
        `Tools: soldering iron of 30 to 60 W at about 300 °C, 0.8 mm solder, side cutters and multimeter.\n• Rest the board PCB1 (${W} × 25 mm) on the bench, silkscreen up and traces down.\n• Solder from the lowest parts to the tallest: first the resistor R1 (68 Ω: blue, grey, black, gold, brown)${d2en}, then the capacitor C1 (100 nF, marked 104, no polarity) and last the regulator U1 (LM317T).\n• Push each part into the holes drawn on the silkscreen, turn the board over, heat the pad and the leg together for 2 to 3 seconds, feed the solder and cut the leftover leg flush with the solder.\n• U1 faces forward with its label, in the order ADJ, OUT, IN from left to right, and the metal tab facing back.\n• Every joint must be shiny and cone-shaped, without touching the next trace.\n• Before powering anything, set the multimeter to continuity and confirm that there is no short between IN and GND, nor between OUT and GND.`,
      ],
      check: ["Aleta do U1 para trás; soldas brilhantes; nenhum curto entre IN, OUT e GND.", "Tab of U1 facing back; shiny joints; no short between IN, OUT and GND."],
      warn: WARN_HOT, adds: ["PCB1", "U1", "R1", "C1", ...(v1 ? [] : ["D2"])], lidDrop: 0, view: "lid", lightOn: false, minutes: 40,
    },
    {
      old: "Tampa: placa", phase: PHASES.eletrica,
      title: ["Fixar a placa na tampa (M3, H3)", "Fix the board to the lid (M3, H3)"],
      text: [
        "• Pegue a tampa de fundo M3, com a face dos 4 suportes de 6 mm e do porta-LED para cima.\n• Apoie a placa PCB1 nos 4 suportes, com a seta FRENTE / FRONT da serigrafia voltada para o lado que será a frente da caixa (o lado do interruptor), e confira que os 4 furos da placa caem sobre os 4 furos dos suportes.\n• Parafuse com 4 parafusos M3 × 8 (H3). Aperte em cruz, um pouco de cada vez, até encostar: o PLA racha se for forçado.\n• Sacuda de leve: a placa não pode se mexer nem encostar na tampa.",
        "• Take the bottom lid M3, with the side of the 4 standoffs of 6 mm and of the LED post facing up.\n• Rest the board PCB1 on the 4 standoffs, with the arrow FRENTE / FRONT of the silkscreen facing the side that will be the front of the box (the switch side), and check that the 4 holes of the board fall over the 4 holes of the standoffs.\n• Screw it down with 4 screws M3 × 8 (H3). Tighten in a cross pattern, a little at a time, until they seat: PLA cracks if forced.\n• Shake it gently: the board must not move or touch the lid.",
      ],
      check: ["Os 4 parafusos encostados e a placa firme, com a seta para o lado do interruptor.", "The 4 screws seated and the board firm, with the arrow toward the switch side."],
      warn: WARN_PLASTIC, adds: ["M3", "H3"], also: ["PCB1"], lidDrop: 0, view: "lid", lightOn: false, minutes: 10,
    },
  ];
  if (v1) {
    drafts.push({
      old: "Tampa: pilha", phase: PHASES.eletrica,
      title: ["Pilha de 9 V no berço (BT1)", "9 V battery in the cradle (BT1)"],
      text: [
        "• Encaixe a pilha de 9 V (6F22) no berço da tampa, com os terminais voltados para o lado esquerdo.\n• Com o clipe ainda solto da pilha, solde o fio vermelho do clipe no pad BT1 POS e o fio preto no pad BT1 NEG.\n• Só depois encaixe o clipe nos terminais da pilha. Se o clipe for encaixado antes, a placa já fica energizada enquanto você solda.\n• Confira a polaridade: o fio vermelho (positivo) vai ao pad BT1 POS.",
        "• Seat the 9 V battery (6F22) in the cradle of the lid, with the terminals toward the left side.\n• With the clip still off the battery, solder the red wire of the clip to the pad BT1 POS and the black wire to the pad BT1 NEG.\n• Only then snap the clip onto the battery terminals. If the clip is snapped on first, the board is already live while you solder.\n• Check the polarity: the red wire (positive) goes to the pad BT1 POS.",
      ],
      check: ["Vermelho no pad BT1 POS e preto no BT1 NEG; clipe encaixado por último.", "Red on the pad BT1 POS and black on BT1 NEG; clip snapped on last."],
      warn: WARN_POLARITY, adds: ["BT1", "W1"], lidDrop: 0, view: "lid", lightOn: false, minutes: 10,
    });
  }
  drafts.push(
    {
      old: "Tampa: montar o LED", phase: PHASES.luz,
      title: ["Montar o LED na tampa (D1)", "Mount the LED on the lid (D1)"],
      text: [
        "• Separe dois fios flexíveis de 24 AWG (W1), um laranja e um preto, com os comprimentos da lista de corte, e descasque 6 mm de cada ponta.\n• Enfie um pedaço de 10 mm de termorretrátil (W2) em cada fio e deixe a luva recuada, longe do calor.\n• Solde o fio laranja na perna longa do LED (ânodo, +) e o fio preto na perna curta (cátodo, −), por menos de 3 segundos em cada perna para não queimar o LED.\n• Corra uma luva sobre cada emenda e encolha com um soprador de ar quente, sem derreter a isolação do fio.\n• Encaixe o LED na sede do porta-LED da tampa M3, com o flange apoiado na sede.\n• Passe os fios pelo furo do porta-LED: eles saem pela fenda lateral, voltada para a placa. A tampa não tem furo para fora.",
        "• Take two flexible wires of 24 AWG (W1), one orange and one black, in the lengths of the cut list, and strip 6 mm from each end.\n• Slip a 10 mm piece of heat-shrink (W2) over each wire and leave the sleeve pulled back, away from the heat.\n• Solder the orange wire to the long leg of the LED (anode, +) and the black wire to the short leg (cathode, −), for less than 3 seconds on each leg so the LED does not burn out.\n• Slide a sleeve over each joint and shrink it with a hot-air blower, without melting the insulation of the wire.\n• Seat the LED in the seat of the LED post of the lid M3, with the flange resting on the seat.\n• Run the wires through the hole of the LED post: they leave through the side slot, which faces the board. The lid has no hole through to the outside.",
      ],
      check: ["Perna longa = ânodo (+). A tampa não tem furo para fora.", "Long leg = anode (+). The lid has no hole through to the outside."],
      warn: bi(`Solde por menos de 3 segundos por perna para não queimar o LED. ${WARN_HOT.pt}`, `每个引脚焊接不超过 3 秒，避免烧坏 LED。${WARN_HOT.zh}`, `Solder each leg for less than 3 seconds so the LED does not burn out. ${WARN_HOT.en}`),
      adds: v1 ? ["D1", "W2"] : ["D1", "W1", "W2"], also: ["M3"], lidDrop: 0, view: "lid", lightOn: false, minutes: 20,
    },
    {
      old: "Tampa: placa", phase: PHASES.luz,
      title: ["Ligar o LED à placa (D1, PCB1)", "Connect the LED to the board (D1, PCB1)"],
      text: [
        "• Leve os dois fios do LED pela fenda lateral até a placa e corte o excesso, deixando uma pequena folga.\n• Solde o fio laranja no pad D1 ANODO e o fio preto no pad D1 CATODO.\n• Puxe de leve cada fio para provar a solda.\n• Confira que nenhum fio encosta na aleta do U1 nem passa por baixo da placa.\n• Prenda os fios soltos com um ponto de cola quente (W3).",
        "• Lead the two wires of the LED through the side slot to the board and trim the excess, leaving a little slack.\n• Solder the orange wire to the pad D1 ANODO and the black wire to the pad D1 CATODO.\n• Pull each wire gently to test the joint.\n• Check that no wire touches the tab of U1 or runs under the board.\n• Tie down loose wires with a dab of hot glue (W3).",
      ],
      check: ["Laranja no pad D1 ANODO e preto no D1 CATODO; nenhum fio na aleta do U1.", "Orange on the pad D1 ANODO and black on D1 CATODO; no wire on the tab of U1."],
      warn: WARN_HOT, adds: [], also: ["PCB1", "D1", "W1", "W2"], lidDrop: 0, view: "lid", lightOn: false, minutes: 10,
    },
    {
      old: "Preparar", phase: PHASES.suporte,
      title: ["Preparar a caixa (M1)", "Prepare the box (M1)"],
      text: [
        "• Retire os suportes de impressão com os dedos ou um alicate de corte, sem forçar as paredes.\n• Limpe todos os furos com uma broca de 3 mm, girada com os dedos (sem furadeira).\n• Passe lixa fina nas bordas do canal da lâmina e sacuda a caixa para confirmar que não ficou nenhum resto dentro.\n• A tampa montada nos passos anteriores fica de lado, ainda aberta.",
        "• Remove the print supports with your fingers or side cutters, without forcing the walls.\n• Clean every hole with a 3 mm drill bit, turned by hand (no power drill).\n• Sand the edges of the slide channel lightly and shake the box to make sure no debris is left inside.\n• The lid assembled in the previous steps stays aside, still open.",
      ],
      check: ["O canal da lâmina deve estar liso e limpo.", "The slide channel must be smooth and clean."],
      adds: ["M1"], lidDrop: 60, view: "iso", minutes: 20,
    },
    {
      old: "Colar o difusor", phase: PHASES.suporte,
      title: ["Colar o difusor (M4)", "Glue the diffuser (M4)"],
      text: [
        "• Com a caixa de cabeça para baixo, ponha o disco M4 (⌀ 26 × 0,8 mm) no encaixe do teto, por dentro, sobre a janela de ⌀ 24 mm.\n• Faça um cordão fino de cola quente (W3) na borda do disco, sem cobrir a janela.\n• Deixe esfriar 1 minuto e toque no disco: ele não pode balançar.",
        "• With the box upside down, set the disc M4 (⌀ 26 × 0.8 mm) in the seat of the ceiling, from inside, over the ⌀ 24 mm window.\n• Run a thin bead of hot glue (W3) around the edge of the disc, without covering the window.\n• Let it cool for 1 minute and touch the disc: it must not rock.",
      ],
      check: ["O difusor não balança e a janela está livre.", "The diffuser does not rock and the window is free."],
      warn: WARN_GLUE, adds: ["M4", "W3"], lidDrop: 60, view: "iso", minutes: 10,
    },
    {
      old: "Provar", phase: PHASES.suporte,
      title: ["Provar a lâmina (L1)", "Test-fit the slide (L1)"],
      text: [
        "• Com a caixa na posição normal, deslize a lâmina L1 (76 × 26 × 1 mm) pelo canal, de lado.\n• Ela deve entrar e sair sem esforço e sem folga lateral visível.\n• Se prender, não force: use o gabarito G2 para escolher o furo certo antes de imprimir de novo.",
        "• With the box in its normal position, slide the slide L1 (76 × 26 × 1 mm) through the channel, from the side.\n• It must go in and out without effort and without visible side play.\n• If it sticks, do not force it: use jig G2 to pick the right size before printing again.",
      ],
      check: ["A lâmina entra pelo lado e fica a 40,4 mm acima do piso.", "The slide enters from the side and sits 40.4 mm above the floor."],
      adds: ["L1"], lidDrop: 60, view: "iso", minutes: 5,
    },
    {
      old: "Instalar o interruptor", phase: PHASES.suporte,
      title: ["Instalar o interruptor (SW1)", "Install the switch (SW1)"],
      text: [
        "• Empurre o interruptor KCD1-101 de fora para dentro no recorte de 21,2 × 15,0 mm da parede frontal, até as duas travas estalarem.\n• Puxe de leve para confirmar que ele não sai.\n• Os dois terminais ficam dentro da caixa. Deixe-os livres: os fios serão soldados mais adiante.",
        "• Push the KCD1-101 switch from outside into the 21.2 × 15.0 mm cut-out of the front wall until the two tabs click.\n• Pull gently to confirm that it does not come out.\n• The two terminals end up inside the box. Leave them free: the wires are soldered later.",
      ],
      adds: ["SW1"], lidDrop: 60, view: "iso", minutes: 5,
    },
  );
  if (!v1) {
    drafts.push(
      {
        old: "Instalar o conector", phase: PHASES.suporte,
        title: ["Instalar o conector de força (J1)", "Install the power jack (J1)"],
        text: [
          "• Passe o conector DC-022B por dentro, no furo de ⌀ 7,8 mm da parede direita, com os terminais para dentro.\n• Aperte a porca por fora com os dedos, sem ferramenta.\n• Se o furo ficar folgado ou apertado, confira o gabarito G2.",
          "• Pass the DC-022B jack from inside through the ⌀ 7.8 mm hole of the right wall, with the terminals inside.\n• Tighten the nut by hand outside, without a tool.\n• If the hole is loose or tight, check jig G2.",
        ],
        adds: ["J1"], lidDrop: 60, view: "iso", minutes: 5,
      },
      {
        old: "Instalar o reostato", phase: PHASES.suporte,
        title: ["Instalar o reostato (RV1)", "Install the rheostat (RV1)"],
        text: [
          "• Passe o eixo do reostato de 220 Ω pelo furo de ⌀ 7,5 mm da parede frontal, por dentro, com os três terminais voltados para a cavidade.\n• Aperte a porca por fora com os dedos e encaixe o botão no eixo de 6 mm.\n• Gire o botão em todo o curso: ele não pode raspar na parede.",
          "• Pass the shaft of the 220 Ω rheostat through the ⌀ 7.5 mm hole of the front wall from inside, with the three terminals facing the cavity.\n• Tighten the nut by hand outside and fit the knob on the 6 mm shaft.\n• Turn the knob through its full travel: it must not rub on the wall.",
        ],
        adds: ["RV1"], lidDrop: 60, view: "iso", minutes: 5,
      },
    );
  }
  drafts.push(
    v1
      ? {
          old: "Tampa: pilha", phase: PHASES.ligacao,
          title: ["Ligar os fios do interruptor (SW1)", "Connect the wires of the switch (SW1)"],
          text: [
            "• Corte dois fios da lista de corte (um vermelho e um laranja) e descasque 6 mm de cada ponta.\n• Solde o fio vermelho no terminal 1 do interruptor SW1 e leve a outra ponta ao pad SW1 A; solde o fio laranja no terminal 2 e leve a outra ponta ao pad SW1 B.\n• Deixe folga nos dois fios para a tampa abrir e fechar sem esticar nenhum.\n• Isole as soldas dos terminais com termorretrátil (W2) e prenda os fios soltos com um ponto de cola quente.",
            "• Cut two wires from the cut list (one red and one orange) and strip 6 mm from each end.\n• Solder the red wire to terminal 1 of the switch SW1 and take the other end to the pad SW1 A; solder the orange wire to terminal 2 and take the other end to the pad SW1 B.\n• Leave slack in both wires so the lid can open and close without stretching either one.\n• Insulate the joints of the terminals with heat-shrink (W2) and tie down loose wires with a dab of hot glue.",
          ],
          check: ["Vermelho no terminal 1 e no pad SW1 A; laranja no terminal 2 e no pad SW1 B.", "Red on terminal 1 and the pad SW1 A; orange on terminal 2 and the pad SW1 B."],
          warn: WARN_HOT, adds: ["WP"], also: ["SW1"], lidDrop: 60, view: "lid", lightOn: false, minutes: 20,
        }
      : {
          old: "Ligar os fios", phase: PHASES.ligacao,
          title: ["Ligar os fios do painel (J1, SW1, RV1)", "Connect the panel wires (J1, SW1, RV1)"],
          text: [
            "• Corte os fios do painel nos comprimentos da lista de corte e descasque 6 mm de cada ponta.\n• Conector J1: solde um fio vermelho no terminal positivo (centro do plugue) e leve a outra ponta ao pad J1 VIN; solde um fio preto no outro terminal e leve a outra ponta ao pad J1 GND. Confirme a polaridade com o multímetro.\n• Interruptor SW1: fio vermelho no terminal 1 e no pad SW1 A; fio laranja no terminal 2 e no pad SW1 B.\n• Reostato RV1: fio amarelo no terminal 1 e no pad pin1, fio verde (cursor) no terminal 2 e no pad pin2, fio azul no terminal 3 e no pad pin3.\n• Deixe folga em todos os fios para a tampa abrir e fechar sem esticar nenhum.\n• Isole as soldas dos terminais com termorretrátil (W2) e prenda os fios soltos com um ponto de cola quente.",
            "• Cut the panel wires to the lengths of the cut list and strip 6 mm from each end.\n• Jack J1: solder a red wire to the positive terminal (centre of the plug) and take the other end to the pad J1 VIN; solder a black wire to the other terminal and take the other end to the pad J1 GND. Confirm the polarity with the multimeter.\n• Switch SW1: red wire on terminal 1 and on the pad SW1 A; orange wire on terminal 2 and on the pad SW1 B.\n• Rheostat RV1: yellow wire on terminal 1 and on the pad pin1, green wire (wiper) on terminal 2 and on the pad pin2, blue wire on terminal 3 and on the pad pin3.\n• Leave slack in every wire so the lid can open and close without stretching any of them.\n• Insulate the joints of the terminals with heat-shrink (W2) and tie down loose wires with a dab of hot glue.",
          ],
          check: ["Cada fio na cor e no pad da lista de ligações; polaridade do J1 conferida.", "Each wire in the colour and on the pad of the wiring list; polarity of J1 checked."],
          warn: WARN_HOT, adds: ["WP"], also: ["J1", "SW1", "RV1"], lidDrop: 60, view: "lid", lightOn: false, minutes: 30,
        },
    {
      old: "Teste", phase: PHASES.ligacao,
      title: ["Teste elétrico com o multímetro", "Electrical test with the multimeter"],
      text: [
        `• Antes de fechar, ligue a alimentação (${v1 ? "clipe encaixado na pilha" : "fonte de 12 V no conector J1"}) e o interruptor SW1.\n• Siga o plano de teste da seção de teste elétrico, ponto por ponto, na ordem da tabela, com o multímetro.\n• Todas as leituras devem ficar dentro da faixa e o LED deve acender.\n• Se uma leitura sair da faixa, desligue, pare e corrija antes de continuar: a coluna "Se estiver fora" da tabela diz onde procurar.`,
        `• Before closing, switch the power on (${v1 ? "clip snapped onto the battery" : "12 V adapter in the jack J1"}) and the switch SW1.\n• Follow the test plan of the electrical test section, point by point, in the order of the table, with the multimeter.\n• Every reading must be inside its range and the LED must light.\n• If a reading is out of range, switch off, stop and fix it before going on: the column "If out of range" of the table says where to look.`,
      ],
      check: [`${v1 ? "18,4 mA" : "18,4 a 4,3 mA"} no LED`, `${v1 ? "18.4 mA" : "18.4 to 4.3 mA"} in the LED`],
      warn: WARN_POLARITY, adds: [], also: ["D1"], lidDrop: 60, view: "lid", lightOn: true, minutes: 15,
    },
    {
      old: "Fechar", phase: PHASES.ligacao,
      title: ["Fechar a tampa (H1)", "Close the lid (H1)"],
      text: [
        "• Confira que nenhum fio está sobre a borda da caixa nem nos furos dos parafusos.\n• Suba a tampa até a caixa sem prender nenhum fio, encostando a borda da tampa na borda da caixa.\n• Aperte os 4 parafusos M3 × 10 (H1) nos cantos, em cruz, um pouco de cada vez, sem forçar o plástico.\n• Ligue o interruptor de novo: a luz difusa deve aparecer na janela do teto.",
        "• Check that no wire lies over the rim of the box or in the screw holes.\n• Raise the lid to the box without trapping any wire, bringing the edge of the lid against the edge of the box.\n• Tighten the 4 screws M3 × 10 (H1) at the corners, in a cross pattern, a little at a time, without forcing the plastic.\n• Switch on again: the diffused light must show in the window of the ceiling.",
      ],
      check: ["Tampa rente à caixa, sem fio preso e com luz na janela.", "Lid flush with the box, no trapped wire and light in the window."],
      warn: WARN_PLASTIC, adds: ["H1"], lidDrop: 40, view: "lid", lightOn: true, minutes: 10,
    },
    {
      old: "Encaixar", phase: PHASES.pregoscopio,
      title: ["Encaixar o pregoscópio (M2, H2, P1 a P10)", "Fit the pregoscope (M2, H2, P1 to P10)"],
      text: [
        "• Tire a metade removível da abraçadeira M2 (2 parafusos M3 × 16, H2).\n• Encoste o tubo externo P2 no anel da coluna, com a cabeça P1 apoiada no topo do anel.\n• Recoloque a metade da abraçadeira e aperte os 2 parafusos M3 × 16 (H2) aos poucos, sem forçar.\n• A objetiva P9 fica sobre a janela do teto da caixa.",
        "• Take off the removable half of the clamp M2 (2 screws M3 × 16, H2).\n• Lean the outer tube P2 into the ring of the column, with the head P1 resting on top of the ring.\n• Put the half of the clamp back and tighten the 2 screws M3 × 16 (H2) a little at a time, without forcing.\n• The objective P9 sits over the window of the ceiling of the box.",
      ],
      check: ["Tubo firme no anel e objetiva centrada sobre a janela.", "Tube firm in the ring and objective centred over the window."],
      warn: WARN_PLASTIC, adds: ["M2", "H2", "P1", "P2", "P3", "P4", "P5", "P6", "P10", "P9"], lidDrop: 0, view: "iso", lightOn: true, minutes: 15,
    },
    {
      old: v1 ? "Foco e uso" : "Ligar a fonte", phase: PHASES.pregoscopio,
      title: v1 ? ["Foco e uso", "Focus and use"] : ["Ligar a fonte, foco e brilho (PS1)", "Connect the supply, focus and brightness (PS1)"],
      text: v1
        ? [
            "• Ligue o interruptor SW1.\n• Afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno P3, até a lâmina ficar nítida.\n• Foco nominal: a lente a 0,8 mm da lâmina, com o tubo interno estendido 37 mm (leia a escala impressa no tubo, na borda do tubo externo).\n• A ponta da objetiva tem mola, mas não force contra o vidro.",
            "• Switch SW1 on.\n• Loosen the clamp and slide the outer tube, or pull the inner tube P3, until the slide is sharp.\n• Nominal focus: the lens 0.8 mm from the slide, with the inner tube pulled out 37 mm (read the scale printed on the tube, at the edge of the outer tube).\n• The tip of the objective is spring-loaded, but do not push it against the glass.",
          ]
        : [
            "• Ligue a fonte de 12 V (PS1) ao conector J1 e ligue o interruptor SW1.\n• Gire o botão RV1 para ajustar o brilho.\n• Afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno P3, até a lâmina ficar nítida.\n• Foco nominal: a lente a 0,8 mm da lâmina, com o tubo interno estendido 37 mm (leia a escala impressa no tubo, na borda do tubo externo).\n• A ponta da objetiva tem mola, mas não force contra o vidro.",
            "• Plug the 12 V supply (PS1) into the jack J1 and switch SW1 on.\n• Turn the knob RV1 to set the brightness.\n• Loosen the clamp and slide the outer tube, or pull the inner tube P3, until the slide is sharp.\n• Nominal focus: the lens 0.8 mm from the slide, with the inner tube pulled out 37 mm (read the scale printed on the tube, at the edge of the outer tube).\n• The tip of the objective is spring-loaded, but do not push it against the glass.",
          ],
      check: ["Imagem nítida com a lâmina a 0,8 mm da objetiva.", "Sharp image with the slide 0.8 mm from the objective."],
      adds: v1 ? [] : ["PS1"], also: ["L1"], lidDrop: 0, view: "iso", lightOn: true, minutes: 10,
    },
  );
  return drafts.map((d, i) => {
    const o = previousZh(version, d.old);
    return {
      n: i + 1,
      phase: d.phase,
      title: bi(d.title[0], o.title.zh, d.title[1]),
      text: bi(d.text[0], o.text.zh, d.text[1]),
      adds: d.adds, also: d.also, lidDrop: d.lidDrop, view: d.view, lightOn: d.lightOn,
      check: d.check ? bi(d.check[0], o.check?.zh ?? o.title.zh, d.check[1]) : undefined,
      warn: d.warn,
      minutes: d.minutes,
    } satisfies ManualStep;
  });
}

export interface FileEntry {
  file: string;
  text: Bilingual;
}

/** The files that go with the manual, so the manufacturer knows what to ask for and what to expect. */
export function manualFiles(version: SuporteVersion): FileEntry[] {
  const dir = version === "v1" ? "v1-pilha" : "v2-fonte";
  const ele = version === "v1" ? "v1-pilha" : "v2-fonte-dimmer";
  return [
    { file: `mecanica/${dir}/suporte-base-coluna-impressao.stl`, text: bi("M1 suporte, na orientação de impressão", "M1 支架（打印方向）", "M1 support, in the print orientation") },
    { file: `mecanica/${dir}/suporte-base-coluna.stl`, text: bi("M1 suporte, na posição de montagem", "M1 支架（装配位置）", "M1 support, in the assembly position") },
    { file: "mecanica/comum/abracadeira-tubo-impressao.stl", text: bi("M2 abraçadeira, na orientação de impressão", "M2 抱箍（打印方向）", "M2 clamp, in the print orientation") },
    { file: `mecanica/${dir}/tampa-fundo.stl`, text: bi("M3 tampa de fundo", "M3 底盖", "M3 bottom lid") },
    { file: "mecanica/comum/difusor.stl", text: bi("M4 difusor", "M4 扩散片", "M4 diffuser") },
    { file: `eletronica/${ele}/esquematico.svg`, text: bi("Esquemático do circuito", "电路原理图", "Circuit schematic") },
    { file: `eletronica/${ele}/gerber/`, text: bi("Gerbers da placa PCB1 (fabricação)", "PCB1 板 Gerber 文件（制板）", "Gerber files of the board PCB1 (fabrication)") },
    { file: `eletronica/${ele}/bom.csv`, text: bi("Lista de componentes da placa", "电路板元件清单", "Component list of the board") },
    { file: `eletronica/${ele}/pick-and-place.csv`, text: bi("Coordenadas de montagem dos componentes", "元件贴装坐标", "Component placement coordinates") },
    { file: `lista-de-compras-${version}.csv`, text: bi("Lista de compras (preço a preencher)", "采购清单（价格待填）", "Shopping list (price to be filled in)") },
    { file: "mecanica/calibracao/", text: bi("Gabaritos G1 a G3 (imprimir primeiro)", "校准件 G1~G3（请先打印）", "Jigs G1 to G3 (print them first)") },
  ];
}

/** Order of soldering on the real driver board: the parts first, then each wire to its pad. */
export function wiringOrder(version: SuporteVersion): Bilingual[] {
  return version === "v1"
    ? [
        bi("Solde U1 (rótulo para a frente: ADJ, OUT, IN), R1 (68 Ω) e C1 (100 nF) nos pads da placa. As trilhas da placa fazem as ligações entre eles.", "把 U1（标签朝前：ADJ、OUT、IN）、R1 (68 Ω) 和 C1 (100 nF) 焊到板的焊盘上。板上的走线完成它们之间的连接。", "Solder U1 (label facing forward: ADJ, OUT, IN), R1 (68 Ω) and C1 (100 nF) to the pads of the board. The traces of the board make the connections between them."),
        bi("LED D1: fio laranja (perna longa, ânodo) ao pad D1 ANODO; fio preto (perna curta, cátodo) ao pad D1 CATODO.", "LED D1：橙色线（长脚，阳极）接 D1 ANODO 焊盘；黑线（短脚，阴极）接 D1 CATODO 焊盘。", "LED D1: orange wire (long leg, anode) to pad D1 ANODO; black wire (short leg, cathode) to pad D1 CATODO."),
        bi("Pilha BT1: fio vermelho do clipe ao pad BT1 POS; fio preto ao pad BT1 NEG.", "电池 BT1：电池扣红线接 BT1 POS 焊盘；黑线接 BT1 NEG 焊盘。", "Battery BT1: red wire of the clip to pad BT1 POS; black wire to pad BT1 NEG."),
        bi("Interruptor SW1: o terminal 1 (fio vermelho) ao pad SW1 A; o terminal 2 (fio laranja) ao pad SW1 B.", "开关 SW1：端子 1（红线）接 SW1 A 焊盘；端子 2（橙线）接 SW1 B 焊盘。", "Switch SW1: terminal 1 (red wire) to pad SW1 A; terminal 2 (orange wire) to pad SW1 B."),
        bi("Isole as soldas do LED com termorretrátil e prenda os fios soltos com um ponto de cola quente.", "用热缩管包住 LED 焊点，并用一点热熔胶固定松散的导线。", "Cover the LED joints with heat-shrink and tie down loose wires with a dab of hot glue."),
      ]
    : [
        bi("Solde U1 (rótulo para a frente: ADJ, OUT, IN), R1 (68 Ω), C1 (100 nF) e D2 (1N5819, faixa para o pad pin2) nos pads da placa. As trilhas fazem as ligações entre eles.", "把 U1（标签朝前：ADJ、OUT、IN）、R1 (68 Ω)、C1 (100 nF) 和 D2 (1N5819，色环端朝向 pin2 焊盘) 焊到板的焊盘上。板上的走线完成它们之间的连接。", "Solder U1 (label facing forward: ADJ, OUT, IN), R1 (68 Ω), C1 (100 nF) and D2 (1N5819, band toward the pin2 pad) to the pads of the board. The traces make the connections between them."),
        bi("LED D1: fio laranja (ânodo) ao pad D1 ANODO; fio preto (cátodo) ao pad D1 CATODO.", "LED D1：橙色线（阳极）接 D1 ANODO 焊盘；黑线（阴极）接 D1 CATODO 焊盘。", "LED D1: orange wire (anode) to pad D1 ANODO; black wire (cathode) to pad D1 CATODO."),
        bi("Conector J1: fio vermelho (centro do plugue, positivo) ao pad J1 VIN; fio preto ao pad J1 GND. Confirme a polaridade com o multímetro.", "插座 J1：红线（插头中心，正极）接 J1 VIN 焊盘；黑线接 J1 GND 焊盘。用万用表确认极性。", "Jack J1: red wire (plug centre, positive) to pad J1 VIN; black wire to pad J1 GND. Confirm the polarity with the multimeter."),
        bi("Interruptor SW1: terminal 1 (fio vermelho) ao pad SW1 A; terminal 2 (fio laranja) ao pad SW1 B.", "开关 SW1：端子 1（红线）接 SW1 A 焊盘；端子 2（橙线）接 SW1 B 焊盘。", "Switch SW1: terminal 1 (red wire) to pad SW1 A; terminal 2 (orange wire) to pad SW1 B."),
        bi("Reostato RV1: fio amarelo ao pad RV1 pin1, fio verde (cursor) ao pad pin2 e fio azul ao pad pin3.", "电位器 RV1：黄线接 RV1 pin1 焊盘，绿线（滑动端）接 pin2 焊盘，蓝线接 pin3 焊盘。", "Rheostat RV1: yellow wire to pad RV1 pin1, green wire (wiper) to pad pin2 and blue wire to pad pin3."),
        bi("Isole as soldas do LED com termorretrátil e prenda os fios soltos com um ponto de cola quente.", "用热缩管包住 LED 焊点，并用一点热熔胶固定松散的导线。", "Cover the LED joints with heat-shrink and tie down loose wires with a dab of hot glue."),
      ];
}

/** Circuit connections as nets, for anyone wiring the same circuit on perforated board instead of the PCB. */
export function netList(version: SuporteVersion): Bilingual[] {
  return version === "v1"
    ? [
        bi("Fio vermelho do clipe BT1 ao terminal 1 do interruptor SW1.", "电池扣 BT1 的红线接开关 SW1 的端子 1。", "Red wire of clip BT1 to terminal 1 of switch SW1."),
        bi("Terminal 2 do SW1 ao pino IN do U1 (LM317T de frente, letras para você: ADJ, OUT, IN da esquerda para a direita).", "SW1 端子 2 接 U1 的 IN 脚（LM317T 正面朝向自己，从左到右依次为 ADJ、OUT、IN）。", "Terminal 2 of SW1 to pin IN of U1 (LM317T seen from the front, letters toward you: ADJ, OUT, IN from left to right)."),
        bi("C1 (100 nF) entre o pino IN do U1 e o GND, soldado perto do U1.", "C1 (100 nF) 接在 U1 的 IN 脚与地之间，靠近 U1 焊接。", "C1 (100 nF) between pin IN of U1 and GND, soldered close to U1."),
        bi("Pino OUT do U1 a uma ponta de R1 (68 Ω).", "U1 的 OUT 脚接 R1 (68 Ω) 的一端。", "Pin OUT of U1 to one end of R1 (68 Ω)."),
        bi("Outra ponta de R1 ao pino ADJ do U1 e ao ânodo (perna longa) do D1: os três no mesmo ponto.", "R1 另一端、U1 的 ADJ 脚和 D1 阳极（长脚）接在同一点。", "The other end of R1 to pin ADJ of U1 and to the anode (long leg) of D1: all three at the same point."),
        bi("Cátodo (perna curta) do D1 ao fio preto do clipe BT1 (GND). O outro terminal do C1 também vai ao GND.", "D1 阴极（短脚）接电池扣 BT1 的黑线（地）。C1 的另一端也接地。", "Cathode (short leg) of D1 to the black wire of clip BT1 (GND). The other terminal of C1 also goes to GND."),
      ]
    : [
        bi("Fonte PS1 (12 V) no conector J1. Confirme com o multímetro que o centro do plugue é positivo.", "12 V 电源 PS1 接插座 J1。用万用表确认插头中心为正极。", "Supply PS1 (12 V) into jack J1. Confirm with the multimeter that the plug centre is positive."),
        bi("Positivo do J1 ao ânodo do D2 (1N5819, lado sem faixa). Cátodo do D2 (lado da faixa) ao terminal 1 do SW1.", "J1 正极接 D2 (1N5819) 阳极（无色环端）。D2 阴极（色环端）接 SW1 端子 1。", "Positive of J1 to the anode of D2 (1N5819, the side without a band). Cathode of D2 (band side) to terminal 1 of SW1."),
        bi("Terminal 2 do SW1 ao pino IN do U1. C1 (100 nF) entre IN e GND, perto do U1.", "SW1 端子 2 接 U1 的 IN 脚。C1 (100 nF) 接在 IN 与地之间，靠近 U1。", "Terminal 2 of SW1 to pin IN of U1. C1 (100 nF) between IN and GND, close to U1."),
        bi("Pino OUT do U1 a R1 (68 Ω); R1 ao terminal 1 do RV1; terminais 2 e 3 do RV1 ligados entre si.", "U1 的 OUT 脚接 R1 (68 Ω)；R1 接 RV1 端子 1；RV1 的端子 2 和 3 短接。", "Pin OUT of U1 to R1 (68 Ω); R1 to terminal 1 of RV1; terminals 2 and 3 of RV1 tied together."),
        bi("Terminais 2 e 3 do RV1 ao pino ADJ do U1 e ao ânodo do D1.", "RV1 端子 2、3 接 U1 的 ADJ 脚和 D1 阳极。", "Terminals 2 and 3 of RV1 to pin ADJ of U1 and to the anode of D1."),
        bi("Cátodo do D1 ao GND do J1. O outro terminal do C1 também vai ao GND.", "D1 阴极接 J1 的地。C1 的另一端也接地。", "Cathode of D1 to GND of J1. The other terminal of C1 also goes to GND."),
      ];
}

/** Parts present up to and including step `n` (1-based). */
export function partsUpToStep(version: SuporteVersion, n: number): Set<string> {
  const out = new Set<string>();
  for (const s of manualSteps(version).slice(0, n)) s.adds.forEach((id) => out.add(id));
  return out;
}

/** Bill of materials rows of the manual: printed, purchased and customer-supplied parts, with names in the three languages and the catalogue size. */
export function manualBom(version: SuporteVersion) {
  return bom(version)
    .filter((l) => l.part.kind !== "calibracao")
    .map((l) => ({
      id: l.part.id,
      name: l.part.name,
      zh: ZH_NAMES[l.part.id] ?? "",
      en: EN_NAMES[l.part.id] ?? l.part.name,
      qty: l.qty,
      kind: l.part.kind,
      spec: l.part.spec,
      standard: STANDARD_SIZE[l.part.id],
    }));
}

/** Name of a part in a language. */
export function partName(id: string, name: string, lang: Lang): string {
  return lang === "zh" ? (ZH_NAMES[id] ?? name) : lang === "en" ? (EN_NAMES[id] ?? name) : name;
}

/** The measurement points and the hints of the electrical test in the three languages, keyed by the Portuguese text of `testPlan`. */
export const TEST_TEXT: Record<string, Bilingual> = {
  "Pilha BT1: positivo para negativo": bi("Pilha BT1: positivo para negativo", "电池 BT1：正极对负极", "Battery BT1: positive to negative"),
  "Entrada do U1 (depois do SW1) para GND": bi("Entrada do U1 (depois do SW1) para GND", "U1 输入端（SW1 之后）对地", "Input of U1 (after SW1) to GND"),
  "Saída do U1 (OUT) para GND": bi("Saída do U1 (OUT) para GND", "U1 输出端 (OUT) 对地", "Output of U1 (OUT) to GND"),
  "Ânodo do D1 (pino ADJ) para GND": bi("Ânodo do D1 (pino ADJ) para GND", "D1 阳极（ADJ 脚）对地", "Anode of D1 (pin ADJ) to GND"),
  "Sobre R1 (entre OUT e ADJ)": bi("Sobre R1 (entre OUT e ADJ)", "R1 两端（OUT 与 ADJ 之间）", "Across R1 (between OUT and ADJ)"),
  "Corrente do LED, multímetro em série": bi("Corrente do LED, multímetro em série", "LED 电流，万用表串联", "LED current, multimeter in series"),
  "Fonte no J1: positivo para negativo, sem carga": bi("Fonte no J1: positivo para negativo, sem carga", "J1 处电源：正极对负极，空载", "Supply at J1: positive to negative, no load"),
  "Depois do D2 para GND": bi("Depois do D2 para GND", "D2 之后对地", "After D2 to GND"),
  "Sobre R1 + RV1 (entre OUT e ADJ)": bi("Sobre R1 + RV1 (entre OUT e ADJ)", "R1 + RV1 两端（OUT 与 ADJ 之间）", "Across R1 + RV1 (between OUT and ADJ)"),
  "Corrente do LED com RV1 no mínimo (0 Ω)": bi("Corrente do LED com RV1 no mínimo (0 Ω)", "RV1 最小（0 Ω）时的 LED 电流", "LED current with RV1 at minimum (0 Ω)"),
  "Corrente do LED com RV1 no máximo (220 Ω)": bi("Corrente do LED com RV1 no máximo (220 Ω)", "RV1 最大（220 Ω）时的 LED 电流", "LED current with RV1 at maximum (220 Ω)"),
};

export const HINT_TEXT: Record<string, Bilingual> = {
  "Pilha fraca, clipe mal encaixado ou ligação invertida.": bi("Pilha fraca, clipe mal encaixado ou ligação invertida.", "电池电量低、电池扣没扣好或接反。", "Weak battery, clip not seated or connection reversed."),
  "Interruptor aberto, solda fria no SW1 ou fio solto.": bi("Interruptor aberto, solda fria no SW1 ou fio solto.", "开关断开、SW1 虚焊或导线松脱。", "Switch off, cold joint at SW1 or a loose wire."),
  "R1 aberto ou LED invertido: a saída sobe até perto da entrada.": bi("R1 aberto ou LED invertido: a saída sobe até perto da entrada.", "R1 开路或 LED 接反：输出升到接近输入。", "R1 open or LED reversed: the output rises close to the input."),
  "LED invertido ou aberto: lê quase o mesmo que a saída do U1; em curto lê perto de 0 V.": bi("LED invertido ou aberto: lê quase o mesmo que a saída do U1; em curto lê perto de 0 V.", "LED 接反或开路：读数几乎等于 U1 输出；短路则接近 0 V。", "LED reversed or open: reads almost the same as the U1 output; shorted reads close to 0 V."),
  "Fora de 1,25 V o LM317 é falso ou está fora de regulação.": bi("Fora de 1,25 V o LM317 é falso ou está fora de regulação.", "不是 1.25 V 说明 LM317 有问题或未稳压。", "Outside 1.25 V the LM317 is fake or out of regulation."),
  "R1 errado (confira as faixas 68 Ω: azul-cinza-preto) ou LM317 sem regulação.": bi("R1 errado (confira as faixas 68 Ω: azul-cinza-preto) ou LM317 sem regulação.", "R1 错误（68 Ω 色环：蓝-灰-黑）或 LM317 未稳压。", "Wrong R1 (check the 68 Ω bands: blue-grey-black) or LM317 not regulating."),
  "Fonte não regulada pode ler até 15 V sem carga; abaixo de 11,5 V a fonte é fraca.": bi("Fonte não regulada pode ler até 15 V sem carga; abaixo de 11,5 V a fonte é fraca.", "非稳压电源空载时可读到 15 V；低于 11.5 V 说明电源太弱。", "An unregulated supply can read up to 15 V with no load; below 11.5 V the supply is weak."),
  "Diodo invertido (lê 0 V) ou queda acima de 0,5 V (diodo errado).": bi("Diodo invertido (lê 0 V) ou queda acima de 0,5 V (diodo errado).", "二极管接反（读 0 V）或压降超过 0.5 V（二极管型号错误）。", "Diode reversed (reads 0 V) or drop above 0.5 V (wrong diode)."),
  "Interruptor aberto ou solda fria.": bi("Interruptor aberto ou solda fria.", "开关断开或虚焊。", "Switch off or cold joint."),
  "R1 ou RV1 abertos: a saída sobe até perto da entrada.": bi("R1 ou RV1 abertos: a saída sobe até perto da entrada.", "R1 或 RV1 开路：输出升到接近输入。", "R1 or RV1 open: the output rises close to the input."),
  "R1 errado (68 Ω) ou o cursor do RV1 não liga ao pino 2 e 3.": bi("R1 errado (68 Ω) ou o cursor do RV1 não liga ao pino 2 e 3.", "R1 错误（68 Ω）或 RV1 滑动端未接到 pin2 和 pin3。", "Wrong R1 (68 Ω) or the wiper of RV1 is not tied to pins 2 and 3."),
  "Abaixo de 3,5 mA o LM317 pode oscilar: confira o RV1 (220 Ω, não 250 Ω ou mais).": bi("Abaixo de 3,5 mA o LM317 pode oscilar: confira o RV1 (220 Ω, não 250 Ω ou mais).", "低于 3.5 mA 时 LM317 可能振荡：请核对 RV1（220 Ω，不要 250 Ω 以上）。", "Below 3.5 mA the LM317 may oscillate: check RV1 (220 Ω, not 250 Ω or more)."),
};
