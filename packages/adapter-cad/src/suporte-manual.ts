/**
 * Content of the construction manual: the assembly steps, the names in Chinese and the "master plan"
 * (the position of every part in one coordinate system). The positions come from `holderLayout`, so they follow
 * the same numbers the printed parts are built from.
 */
import { DEFAULT_HOLDER_PARAMS, holderLayout } from "./holder.ts";
import { bom, type SuporteVersion } from "./suporte-catalog.ts";

export interface Bilingual {
  pt: string;
  zh: string;
}

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
  lightOn?: boolean;
  check?: Bilingual;
}

/** Chinese names, so the manufacturer's engineers can match the drawing to the parts. */
export const ZH_NAMES: Record<string, string> = {
  M1: "支架：灯箱、立柱和横臂", M2: "镜筒抱箍", M3: "底盖", M4: "扩散片",
  P1: "头部：平板和螺纹杆", P2: "外镜筒", P3: "内镜筒（伸缩）", P4: "左夹爪", P5: "右夹爪", P6: "右旋钮", P10: "左旋钮（P6 的镜像）", P7: "物镜环", P8: "下套筒", P9: "物镜 40x / 0.65",
  L1: "显微镜载玻片", D1: "白光 LED 5 mm（漫射型）", R1: "电阻 R1（设定电流）", C1: "陶瓷电容 100 nF", D2: "二极管 1N5819（防反接）", SW1: "摇臂开关 KCD1-101",
  BT1: "9 V 电池（6F22）及电池扣", PS1: "12 V 500 mA 电源适配器", J1: "面板 DC 插座 DC-022B", U1: "LM317T 可调稳压器", RV1: "220 Ω 线性电位器（WH148 B221）", PCB1: "驱动板",
  H1: "M3 × 10 自攻螺钉", H2: "M3 × 16 自攻螺钉", H3: "M3 × 8 自攻螺钉",
  W1: "柔性导线 24 AWG", W2: "热缩管 ⌀2~3 mm", W3: "热熔胶和双面胶",
  G1: "镜筒校准件", G2: "零件校准件", G3: "电池校准件",
};

/** Catalogue sizes of the purchased parts, the numbers the drawing is dimensioned with. */
export const STANDARD_SIZE: Record<string, Bilingual> = {
  D1: { pt: "⌀ 5,0 mm; flange ⌀ 5,8 mm; altura ≈ 8,6 mm; passo das pernas 2,54 mm", zh: "⌀5.0 mm；法兰 ⌀5.8 mm；高度约 8.6 mm；引脚间距 2.54 mm" },
  R1: { pt: "¼ W axial: corpo ≈ 6,3 × 2,3 mm; fio ⌀ 0,5 mm; passo 10 mm", zh: "¼ W 轴向：本体约 6.3 × 2.3 mm；引线 ⌀0.5 mm；间距 10 mm" },
  C1: { pt: "cerâmico 100 nF (104) 50 V; passo 5 mm", zh: "陶瓷电容 100 nF (104) 50 V；引脚间距 5 mm" },
  D2: { pt: "DO-41: corpo ≈ 5,2 × 2,7 mm; fio ⌀ 0,8 mm; faixa = cátodo", zh: "DO-41：本体约 5.2 × 2.7 mm；引线 ⌀0.8 mm；色环端为阴极" },
  U1: { pt: "TO-220: 10,0 × 4,5 × 15,0 mm; pinos ADJ-OUT-IN, passo 2,54 mm", zh: "TO-220：10.0 × 4.5 × 15.0 mm；引脚 ADJ-OUT-IN，间距 2.54 mm" },
  SW1: { pt: "recorte de painel 21,2 × 15,0 mm; 2 terminais", zh: "面板开孔 21.2 × 15.0 mm；2 个接线端" },
  BT1: { pt: "6F22: 48,5 × 26,5 × 17,5 mm", zh: "6F22：48.5 × 26.5 × 17.5 mm" },
  PS1: { pt: "12 V 500 mA; plugue P4 5,5 × 2,1 mm, centro positivo", zh: "12 V 500 mA；P4 插头 5.5 × 2.1 mm，中心为正极" },
  J1: { pt: "DC-022B: furo de painel ⌀ 7,8 mm; plugue 5,5 × 2,1 mm", zh: "DC-022B：面板孔 ⌀7.8 mm；插头 5.5 × 2.1 mm" },
  RV1: { pt: "WH148: eixo ⌀ 6 mm; rosca M7; furo ⌀ 7,5 mm", zh: "WH148：轴 ⌀6 mm；M7 螺纹；开孔 ⌀7.5 mm" },
  PCB1: { pt: "1,6 mm de espessura; furos M3 a 3,5 mm das bordas", zh: "板厚 1.6 mm；M3 安装孔距边缘 3.5 mm" },
  L1: { pt: "76 × 26 × 1 mm (padrão de microscopia)", zh: "76 × 26 × 1 mm（显微镜标准）" },
  H1: { pt: "M3 × 10; cabeça panela ⌀ ≈ 5,6 mm", zh: "M3 × 10；圆头 ⌀约 5.6 mm" },
  H2: { pt: "M3 × 16; cabeça panela ⌀ ≈ 5,6 mm", zh: "M3 × 16；圆头 ⌀约 5.6 mm" },
  H3: { pt: "M3 × 8; cabeça panela ⌀ ≈ 5,6 mm", zh: "M3 × 8；圆头 ⌀约 5.6 mm" },
  W1: { pt: "24 AWG: condutor ⌀ 0,51 mm; isolação ⌀ ≈ 1,4 mm", zh: "24 AWG：导体 ⌀0.51 mm；绝缘外径约 1.4 mm" },
  W2: { pt: "⌀ 2 a 3 mm antes de encolher; luvas de 10 mm", zh: "收缩前 ⌀2~3 mm；每段 10 mm" },
  W3: { pt: "bastão de cola ⌀ 7 mm; fita dupla face de 12 mm", zh: "热熔胶棒 ⌀7 mm；12 mm 双面胶" },
  P9: { pt: "objetiva 40x / 0,65, ⌀ 20 mm, comprimento 35 mm", zh: "40x / 0.65 物镜，⌀20 mm，长 35 mm" },
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
  const swZ = box.height / 2;
  const put = (id: string, x: number, y: number, z: number, size: [number, number, number], mount: Bilingual, hidden = false): PlacedPart => ({
    id, x: round(x), y: round(y), z: round(z), size: size.map(round) as [number, number, number], mount, hidden,
  });
  const parts: PlacedPart[] = [
    put("M1", 0, (box.yMin + box.yMax) / 2, layout.totalHeight / 2, [box.xMax - box.xMin, box.yMax - box.yMin, layout.totalHeight], { pt: "apoiado na mesa", zh: "放置于桌面" }),
    put("M3", 0, (box.yMin + box.yMax) / 2, -p.wall / 2, [box.xMax - box.xMin, box.yMax - box.yMin, p.wall], { pt: "4 parafusos H1 nos cantos", zh: "四角 4 颗 H1 螺钉" }, true),
    put("M4", 0, 0, layout.cavity.top + 0.6, [p.diffuserDiameter, p.diffuserDiameter, p.diffuserThickness], { pt: "cola quente (W3) no encaixe do teto", zh: "用热熔胶（W3）粘在顶部凹槽" }, true),
    put("M2", 0, 0, (ring.bottom + ring.top) / 2, [ring.outerRadius * 2 + 20, ring.outerRadius * 2, ring.top - ring.bottom], { pt: "2 parafusos H2 nas orelhas", zh: "耳部 2 颗 H2 螺钉" }),
    put("L1", 0, 0, layout.samplePlane - 0.5, [76, 26, 1], { pt: "deslizada no canal, de lado", zh: "从侧面滑入槽道" }),
    put("D1", ledPost.x, ledPost.y, ledPost.ledTop - 4.3, [5.8, 5.8, 8.6], { pt: "sede do porta-LED da tampa", zh: "插入盖板 LED 座" }, true),
    put("PCB1", bx, by, board.standoffHeight + 0.8, [bw, board.yMax - board.yMin, 1.6], { pt: "4 parafusos H3 nos suportes de 6 mm", zh: "4 颗 H3 螺钉固定在 6 mm 立柱上" }, true),
    put("U1", bx - bw * 0.12, by + 4, board.standoffHeight + 1.6 + 7.5, [10, 4.5, 15], { pt: "soldado na PCB1, aleta para fora", zh: "焊在 PCB1 上，散热片朝外" }, true),
    put("R1", bx + bw * 0.12, by - 3, board.standoffHeight + 1.6 + 1.2, [6.3, 2.3, 2.3], { pt: "soldado na PCB1", zh: "焊在 PCB1 上" }, true),
    put("C1", bx + bw * 0.02, by - 7, board.standoffHeight + 1.6 + 3, [5, 3, 6], { pt: "soldado na PCB1, perto do U1", zh: "焊在 PCB1 上，靠近 U1" }, true),
    put("SW1", p.switchCutout.x, box.yMin + p.wall / 2, swZ, [p.switchCutout.width, 10, p.switchCutout.height], { pt: "recorte da parede frontal, travas a pressão", zh: "前壁开孔，卡扣固定" }),
    put("H1", 0, 0, -p.wall / 2, [5.6, 5.6, 2], { pt: "4 furos da tampa (ver tabela abaixo)", zh: "盖板 4 孔（见下表）" }, true),
    put("H2", 0, EAR_SCREW_Y, (ring.bottom + ring.top) / 2, [2 * 24.4 + 5.6, 16, 5.6], { pt: "2 orelhas da abraçadeira, eixo Y (ver tabela abaixo)", zh: "抱箍 2 个耳部，沿 Y 轴（见下表）" }),
    put("H3", bx, by, board.standoffHeight + 1.6, [5.6, 5.6, 2], { pt: "4 furos da PCB1 (ver tabela abaixo)", zh: "PCB1 4 孔（见下表）" }, true),
    put("W1", ledPost.x, ledPost.y + 8 * ledPost.slot.dir, 8, [3, 20, 3], { pt: "do LED à PCB1 pela fenda lateral do porta-LED", zh: "从 LED 经座侧面开槽到 PCB1" }, true),
    put("W2", ledPost.x, ledPost.y + 8 * ledPost.slot.dir, 3, [3, 10, 3], { pt: "sobre as duas soldas do LED", zh: "套在 LED 的两个焊点上" }, true),
    put("W3", 0, 0, layout.cavity.top + 0.4, [p.diffuserDiameter, p.diffuserDiameter, 1], { pt: "cordão na borda do difusor", zh: "扩散片边缘的胶圈" }, true),
    put("P9", 0, 0, tube.noseZ + p.objectiveLength / 2, [p.objectiveDiameter, p.objectiveDiameter, p.objectiveLength], { pt: "rosqueada no tubo interno do pregoscópio", zh: "旋在显微镜内镜筒上" }),
    put("P2", 0, 0, (tube.bottom + tube.top) / 2, [p.tubeDiameter, p.tubeDiameter, tube.top - tube.bottom], { pt: "no anel da coluna, preso pela M2", zh: "放入立柱环，由 M2 夹紧" }),
    put("P1", 0, 0, tube.top + 7.5, [50, 50, 15], { pt: "apoiada no topo do anel", zh: "放在环的顶部" }),
  ];
  if (version === "v1") {
    parts.push(put("BT1", 0, p.batteryY, 8.75, [p.batteryLength, p.batteryWidth, 17.5], { pt: "berço da tampa, clipe voltado para o lado esquerdo", zh: "盖板电池仓，电池扣朝左" }, true));
  } else {
    parts.push(
      put("J1", box.xMax - p.wall / 2, p.jackY, swZ, [p.wall + 10, p.jackDiameter, p.jackDiameter], { pt: "furo da parede direita, porca por fora", zh: "右壁开孔，螺母在外侧" }),
      put("RV1", p.knobX, box.yMin + p.wall / 2, swZ, [14, 8, 14], { pt: "furo da parede frontal, porca por fora", zh: "前壁开孔，螺母在外侧" }),
      put("D2", bx - bw * 0.3, by - 7, board.standoffHeight + 1.6 + 1.4, [5.2, 2.7, 2.7], { pt: "soldado na PCB1, faixa para o lado do SW1", zh: "焊在 PCB1 上，色环端朝向 SW1" }, true),
      put("PS1", box.xMax + 40, 0, swZ, [38, 26, 24], { pt: "fora da caixa, cabo ao conector J1", zh: "位于盒外，电缆接 J1" }),
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

const bi = (pt: string, zh: string): Bilingual => ({ pt, zh });

/** The assembly sequence of a version, in the order a person builds it. */
export function manualSteps(version: SuporteVersion): ManualStep[] {
  const v1 = version === "v1";
  const steps: Omit<ManualStep, "n">[] = [
    {
      title: bi("Preparar a caixa (M1)", "准备灯箱 (M1)"),
      text: bi(
        "Retire o suporte de impressão e limpe todos os furos com uma broca de 3 mm. Passe lixa fina nas bordas do canal da lâmina e confira que não ficou nenhum resto dentro da caixa.",
        "去除打印支撑，用 3 mm 钻头清理所有孔。用细砂纸打磨载玻片槽道边缘，并确认盒内没有残留碎屑。",
      ),
      adds: ["M1"], lidDrop: 0, view: "iso",
      check: bi("O canal da lâmina deve estar liso e limpo.", "载玻片槽道应光滑干净。"),
    },
    {
      title: bi("Colar o difusor (M4)", "粘贴扩散片 (M4)"),
      text: bi(
        "Coloque o disco M4 (⌀ 26 × 0,8 mm) no encaixe do teto da caixa, por dentro. Prenda com um cordão fino de cola quente (W3) na borda, sem cobrir a janela de ⌀ 24 mm.",
        "将扩散片 M4（⌀26 × 0.8 mm）从盒内放入顶部凹槽，沿边缘涂一圈细热熔胶（W3），不要盖住 ⌀24 mm 的光窗。",
      ),
      adds: ["M4", "W3"], lidDrop: 0, view: "iso",
    },
    {
      title: bi("Provar a lâmina (L1)", "试装载玻片 (L1)"),
      text: bi(
        "Deslize a lâmina L1 (76 × 26 × 1 mm) pelo canal. Ela deve entrar e sair sem esforço e sem folga lateral visível. Se prender, use o gabarito G2 para escolher o furo certo antes de imprimir de novo.",
        "将载玻片 L1（76 × 26 × 1 mm）滑入槽道，应顺畅进出且侧向无明显间隙。若过紧，请先用校准件 G2 确定尺寸再重新打印。",
      ),
      adds: ["L1"], lidDrop: 0, view: "iso",
      check: bi("A lâmina entra pelo lado e fica a 40,4 mm acima do piso.", "载玻片从侧面进入，距底面 40.4 mm。"),
    },
    {
      title: bi("Instalar o interruptor (SW1)", "安装开关 (SW1)"),
      text: bi(
        "Empurre o interruptor KCD1-101 de fora para dentro no recorte de 21,2 × 15,0 mm da parede frontal, até as travas estalarem. Os dois terminais ficam dentro da caixa.",
        "将 KCD1-101 摇臂开关从前壁外侧推入 21.2 × 15.0 mm 开孔，直至卡扣弹出。两个接线端位于盒内。",
      ),
      adds: ["SW1"], lidDrop: 0, view: "iso",
    },
  ];
  if (!v1) {
    steps.push(
      {
        title: bi("Instalar o conector de força (J1)", "安装电源插座 (J1)"),
        text: bi(
          "Passe o conector DC-022B por dentro, no furo de ⌀ 7,8 mm da parede direita, e aperte a porca por fora com os dedos. Se o furo ficar folgado ou apertado, confira o gabarito G2.",
          "将 DC-022B 插座从盒内穿过右壁 ⌀7.8 mm 孔，在外侧用手拧紧螺母。若孔过松或过紧，请核对校准件 G2。",
        ),
        adds: ["J1"], lidDrop: 0, view: "iso",
      },
      {
        title: bi("Instalar o reostato (RV1)", "安装电位器 (RV1)"),
        text: bi(
          "Passe o eixo do reostato de 220 Ω pelo furo de ⌀ 7,5 mm da parede frontal, por dentro. Aperte a porca por fora e encaixe o botão.",
          "将 220 Ω 电位器轴从盒内穿过前壁 ⌀7.5 mm 孔，在外侧拧紧螺母并装上旋钮。",
        ),
        adds: ["RV1"], lidDrop: 0, view: "iso",
      },
    );
  }
  steps.push(
    {
      title: bi("Tampa: montar o LED (M3, D1)", "底盖：安装 LED (M3, D1)"),
      text: bi(
        "Solde dois fios (W1) nas pernas do LED: laranja na perna longa (ânodo), preto na curta (cátodo). Isole cada solda com termorretrátil (W2). Encaixe o LED na sede do porta-LED da tampa M3. Os fios descem pelo furo do porta-LED e saem pela fenda lateral, voltada para a placa.",
        "将两根导线（W1）焊到 LED 引脚：橙色接长脚（阳极），黑色接短脚（阴极）。每个焊点套上热缩管（W2）。把 LED 装入底盖 M3 的 LED 座，导线沿座内孔向下，从侧面开槽引出，朝向驱动板。",
      ),
      adds: ["M3", "D1", "W1", "W2"], lidDrop: 60, view: "lid", lightOn: false,
      check: bi("Perna longa = ânodo (+). A tampa não tem furo para fora.", "长脚为阳极 (+)。盖板底部没有通孔。"),
    },
    {
      title: bi(v1 ? "Tampa: placa do driver (PCB1, U1, R1, C1)" : "Tampa: placa do driver (PCB1, U1, R1, C1, D2)", v1 ? "底盖：驱动板 (PCB1, U1, R1, C1)" : "底盖：驱动板 (PCB1, U1, R1, C1, D2)"),
      text: bi(
        `Solde ${v1 ? "o regulador U1, o resistor R1 (68 Ω) e o capacitor C1 (100 nF)" : "o regulador U1, o resistor R1 (68 Ω), o capacitor C1 (100 nF) e o diodo D2 (faixa para o lado do interruptor)"} na placa PCB1 (${v1 ? "40" : "70"} × 25 mm), conforme o esquemático. Parafuse a placa nos 4 suportes da tampa com M3 × 8 (H3). Ligue os fios do LED e dos demais componentes na ordem da aba Eletrônica.`,
        `按原理图将${v1 ? "稳压器 U1、电阻 R1 (68 Ω) 和电容 C1 (100 nF)" : "稳压器 U1、电阻 R1 (68 Ω)、电容 C1 (100 nF) 和二极管 D2（色环端朝向开关）"}焊到 PCB1（${v1 ? "40" : "70"} × 25 mm）上。用 M3 × 8 螺钉 (H3) 把板固定在盖板的 4 个立柱上。按“电子”页的顺序连接 LED 和其他元件的导线。`,
      ),
      adds: ["PCB1", "U1", "R1", "C1", ...(v1 ? [] : ["D2"]), "H3"], also: ["W1"], lidDrop: 60, view: "lid", lightOn: false,
      check: bi("Aleta do U1 para fora; nenhuma solda encosta em outra.", "U1 散热片朝外；任何焊点不得相碰。"),
    },
  );
  if (v1) {
    steps.push({
      title: bi("Tampa: pilha de 9 V (BT1)", "底盖：9 V 电池 (BT1)"),
      text: bi(
        "Encaixe a pilha de 9 V no berço da tampa e ligue o clipe: fio vermelho ao interruptor SW1 e fio preto ao GND da placa, conforme a aba Eletrônica. Ainda não encaixe o clipe na pilha se for soldar.",
        "将 9 V 电池放入盖板电池仓并接好电池扣：红线接开关 SW1，黑线接板上 GND，见“电子”页。若还要焊接，请先不要扣上电池。",
      ),
      adds: ["BT1"], also: ["W1"], lidDrop: 60, view: "lid", lightOn: false,
    });
  } else {
    steps.push({
      title: bi("Ligar os fios do painel", "连接面板导线"),
      text: bi(
        "Solde os fios do conector J1, do interruptor SW1 e dos três terminais do reostato RV1 à placa, nas cores indicadas na aba Eletrônica (vermelho positivo, preto GND, amarelo/verde/azul para o reostato). Deixe folga para a tampa abrir.",
        "按“电子”页指定的颜色，将插座 J1、开关 SW1 和电位器 RV1 三个端子的导线焊到板上（红色为正极，黑色为地，黄/绿/蓝接电位器）。预留余量以便打开盖板。",
      ),
      adds: [], also: ["W1", "J1", "SW1", "RV1"], lidDrop: 60, view: "lid", lightOn: false,
    });
  }
  steps.push(
    {
      title: bi("Teste elétrico com o multímetro", "万用表电气测试"),
      text: bi(
        "Antes de fechar, ligue a alimentação e siga o plano de teste da aba Eletrônica ponto por ponto. Todas as leituras devem ficar dentro da faixa e o LED deve acender. Se uma leitura sair da faixa, pare e corrija antes de continuar.",
        "关盖前接通电源，按“电子”页的测试计划逐点测量。所有读数应在范围内且 LED 点亮。如有读数超出范围，请先排除故障再继续。",
      ),
      adds: [], also: ["D1"], lidDrop: 60, view: "lid", lightOn: true,
      check: bi(`${v1 ? "18,4 mA" : "18,4 a 4,3 mA"} no LED`, `LED 电流 ${v1 ? "18.4 mA" : "18.4 至 4.3 mA"}`),
    },
    {
      title: bi("Fechar a tampa (H1)", "合上底盖 (H1)"),
      text: bi(
        "Suba a tampa até a caixa sem prender nenhum fio e aperte os 4 parafusos M3 × 10 (H1) nos cantos. Aperte aos poucos, em cruz, sem forçar o plástico.",
        "把底盖托到灯箱下方，确保不夹住任何导线，在四角拧入 4 颗 M3 × 10 螺钉 (H1)。分次交叉拧紧，不要过度用力。",
      ),
      adds: ["H1"], lidDrop: 0, view: "iso", lightOn: true,
    },
    {
      title: bi("Encaixar o pregoscópio (M2, H2, P1 a P10)", "装入显微镜 (M2, H2, P1~P10)"),
      text: bi(
        "Tire a metade removível da abraçadeira M2, encoste o tubo externo P2 no anel da coluna, recoloque a metade e aperte os 2 parafusos M3 × 16 (H2) sem forçar. A cabeça P1 apoia no topo do anel e a objetiva P9 fica sobre a janela.",
        "取下抱箍 M2 的可拆半环，将外镜筒 P2 靠入立柱环，装回半环并拧入 2 颗 M3 × 16 螺钉 (H2)，不要用力过大。头部 P1 压在环的顶面，物镜 P9 位于光窗正上方。",
      ),
      adds: ["M2", "H2", "P1", "P2", "P3", "P4", "P5", "P6", "P10", "P7", "P8", "P9"], lidDrop: 0, view: "iso", lightOn: true,
    },
    {
      title: bi(v1 ? "Foco e uso" : "Ligar a fonte, foco e brilho (PS1)", v1 ? "对焦与使用" : "连接电源、对焦与亮度调节 (PS1)"),
      text: bi(
        v1
          ? "Ligue o interruptor SW1. Afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno P3, até a lâmina ficar nítida. Foco nominal: a lente a 0,8 mm da lâmina, com o tubo interno recolhido 22,5 mm."
          : "Ligue a fonte de 12 V (PS1) ao conector J1 e o interruptor SW1. Gire o botão RV1 para ajustar o brilho. Afrouxe a abraçadeira e deslize o tubo externo, ou puxe o tubo interno P3, até a lâmina ficar nítida. Foco nominal: a lente a 0,8 mm da lâmina.",
        v1
          ? "打开开关 SW1。松开抱箍并滑动外镜筒，或拉出内镜筒 P3，直到载玻片图像清晰。标称对焦：镜头距载玻片 0.8 mm，内镜筒收回 22.5 mm。"
          : "将 12 V 电源 (PS1) 接到插座 J1 并打开开关 SW1。旋转 RV1 旋钮调节亮度。松开抱箍并滑动外镜筒，或拉出内镜筒 P3，直到载玻片图像清晰。标称对焦：镜头距载玻片 0.8 mm。",
      ),
      adds: v1 ? [] : ["PS1"], also: ["L1"], lidDrop: 0, view: "iso", lightOn: true,
    },
  );
  return steps.map((s, i) => ({ ...s, n: i + 1 }));
}

/** Parts present up to and including step `n` (1-based). */
export function partsUpToStep(version: SuporteVersion, n: number): Set<string> {
  const out = new Set<string>();
  for (const s of manualSteps(version).slice(0, n)) s.adds.forEach((id) => out.add(id));
  return out;
}

/** Bill of materials rows of the manual: the purchased and printed parts, with Chinese name and catalogue size. */
export function manualBom(version: SuporteVersion) {
  return bom(version)
    .filter((l) => l.part.kind !== "calibracao" && l.part.kind !== "referencia")
    .map((l) => ({ id: l.part.id, name: l.part.name, zh: ZH_NAMES[l.part.id] ?? "", qty: l.qty, kind: l.part.kind, spec: l.part.spec, standard: STANDARD_SIZE[l.part.id] }));
}
