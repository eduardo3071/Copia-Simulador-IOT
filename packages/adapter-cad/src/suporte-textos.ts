/**
 * Fixed texts of the manual in Portuguese, Chinese and English: tools, safety, status, inspection and the names of the editions.
 * They live here, away from the React code, so the translation review sheet and the tests can read them.
 */
import type { Bilingual } from "./suporte-manual.ts";
import type { SuporteVersion } from "./suporte-catalog.ts";

const T = (pt: string, zh: string, en: string): Bilingual => ({ pt, zh, en });

export const TOOLS: Bilingual[] = [
  T("Impressora 3D FDM, mesa de pelo menos 300 mm, PLA", "FDM 3D 打印机，打印平台不小于 300 mm，PLA 耗材", "FDM 3D printer, bed of at least 300 mm, PLA filament"),
  T("Ferro de soldar 30 a 40 W, solda 0,8 mm, alicate descascador", "30~40 W 电烙铁，0.8 mm 焊锡，剥线钳", "30 to 40 W soldering iron, 0.8 mm solder, wire stripper"),
  T("Multímetro (tensão e corrente contínua)", "万用表（直流电压和电流）", "Multimeter (DC voltage and current)"),
  T("Pistola de cola quente, soprador ou isqueiro para o termorretrátil", "热熔胶枪，热风枪或打火机（用于热缩管）", "Hot-glue gun, heat gun or lighter for the heat-shrink"),
  T("Chave Phillips pequena; broca de 3 mm; lixa fina; paquímetro", "小号十字螺丝刀；3 mm 钻头；细砂纸；游标卡尺", "Small Phillips screwdriver; 3 mm drill bit; fine sandpaper; caliper"),
];

export const PRINT: { part: string; text: Bilingual }[] = [
  { part: "M1", text: T("arquivo -impressao, deitado nas costas; suportes só dentro da caixa", "使用 -impressao 文件，背面朝下打印；仅在盒内加支撑", "file -impressao, lying on its back; supports only inside the box") },
  { part: "M2", text: T("arquivo -impressao, abre para cima; sem suportes", "使用 -impressao 文件，开口朝上；不需要支撑", "file -impressao, opening upward; no supports") },
  { part: "M3", text: T("já plana; sem suportes", "已是平板；不需要支撑", "already flat; no supports") },
  { part: "M4", text: T("plano, PLA natural ou branco, 1 a 2 camadas; sem suportes", "平放，本色或白色 PLA，1~2 层；不需要支撑", "flat, natural or white PLA, 1 to 2 layers; no supports") },
];

export const STATUS: Bilingual[] = [
  T("Tubo externo: o STEP dizia 30 mm e o paquímetro 33,5 mm. O 3D e o furo da abraçadeira usam 33,5 mm; confirmar com o gabarito G1.", "外镜筒：STEP 为 30 mm，卡尺测量为 33.5 mm。3D 和抱箍孔按 33.5 mm 设计，需用校准件 G1 确认。", "Outer tube: the STEP said 30 mm and the caliper 33.5 mm. The 3D and the clamp bore use 33.5 mm; confirm with jig G1."),
  T("Objetiva: 38 mm de comprimento total (dado do fabricante) e 35 mm abaixo do tubo interno (medido); a distância de trabalho real (0,4 a 0,8 mm) depende do modelo e deve ser conferida no foco.", "物镜：总长 38 mm（厂家数据），内镜筒下方露出 35 mm（实测）；实际工作距离（0.4~0.8 mm）取决于型号，需在对焦时核实。", "Objective: 38 mm total length (manufacturer data) and 35 mm below the inner tube (measured); the real working distance (0.4 to 0.8 mm) depends on the model and must be checked while focusing."),
  T("Recortes do interruptor, conector e botão, flange do LED, lâmina e parafusos: confirmar com o gabarito G2; pilha de 9 V com o G3.", "开关、插座和旋钮开孔、LED 法兰、载玻片和螺钉：用校准件 G2 确认；9 V 电池用 G3。", "Cut-outs of the switch, jack and knob, LED flange, slide and screws: confirm with jig G2; the 9 V battery with G3."),
  T("As trilhas e a máscara das placas passaram numa verificação automática, mas não foram vistas num programa de PCB.", "电路板走线和阻焊层已通过自动检查，但尚未在 PCB 软件中人工查看。", "The traces and the solder mask of the boards passed an automatic check but have not been looked at in PCB software."),
  T("O texto em chinês e em inglês foi escrito sem tradutor técnico e precisa de revisão por um falante nativo.", "中文和英文内容未经专业技术翻译，需由母语人员审校。", "The Chinese and English text was written without a technical translator and needs review by a native speaker."),
];

export const SAFETY: Bilingual[] = [
  T("Ferro de soldar a cerca de 300 °C: use o suporte, ventile o local, não toque na ponta.", "烙铁温度约 300 °C：使用烙铁架，保持通风，勿触碰烙铁头。", "Soldering iron at about 300 °C: use the stand, ventilate the room, never touch the tip."),
  T("Cola quente e termorretrátil queimam: espere esfriar antes de manusear.", "热熔胶和热缩管会烫伤：冷却后再触碰。", "Hot glue and heat-shrink burn: let them cool before handling."),
  T("Confira a polaridade antes de ligar (LED, diodo, bateria, plugue de centro positivo). Ligação invertida queima componentes.", "通电前核对极性（LED、二极管、电池、中心正极插头）。接反会烧坏元件。", "Check the polarity before powering up (LED, diode, battery, positive-centre plug). A reversed connection burns components."),
  T("Use somente a fonte de 12 V indicada (v2) e pilha alcalina nova de 9 V (v1). Não use baterias recarregáveis de lítio.", "仅使用指定的 12 V 电源（v2）和新的 9 V 碱性电池（v1）。不要使用锂充电电池。", "Use only the 12 V supply listed (v2) and a new 9 V alkaline battery (v1). Do not use rechargeable lithium batteries."),
  T("Não aperte demais os parafusos em PLA e não force o vidro da lâmina.", "PLA 上的螺钉不要拧得过紧，不要用力挤压载玻片。", "Do not overtighten screws in PLA and do not force the glass slide."),
];

export const QA: Bilingual[] = [
  T("A lâmina L1 desliza no canal sem esforço e sem folga lateral visível.", "载玻片 L1 在槽道内滑动顺畅，侧向无明显间隙。", "The slide L1 moves in the channel without effort and without visible side play."),
  T("O tubo do pregoscópio entra no anel e fica preso pela M2 sem rachar o PLA.", "显微镜镜筒装入环中，由 M2 夹紧，PLA 无开裂。", "The pregoscope tube fits the ring and is held by M2 without cracking the PLA."),
  T("Com o tubo interno estendido 19 mm na escala, a lente fica a cerca de 0,8 mm da lâmina e a imagem foca.", "内镜筒按刻度伸出 19 mm 时，镜头距载玻片约 0.8 mm 且图像可对焦。", "With the inner tube pulled out 19 mm on its scale the lens is about 0.8 mm from the slide and the image focuses."),
  T("O LED acende e a luz é uniforme sobre a janela, sem ponto quente.", "LED 点亮，光窗光线均匀，无亮斑。", "The LED lights and the light is even over the window, with no hot spot."),
  T("Corrente do LED medida dentro da faixa do teste elétrico.", "LED 电流在电气测试范围内。", "LED current measured inside the range of the electrical test."),
  T("Tampa fechada com 4 parafusos, sem fio preso e sem folga maior que 0,5 mm.", "底盖用 4 颗螺钉关紧，无夹线，间隙不大于 0.5 mm。", "Lid closed with 4 screws, no trapped wire and no gap larger than 0.5 mm."),
  T("Interruptor trava a pressão; na v2 o botão gira suave e o plugue encaixa.", "开关卡扣牢固；v2 的旋钮转动顺滑，插头插入到位。", "The switch snaps in; on v2 the knob turns smoothly and the plug seats."),
  T("Nada solto ao sacudir de leve; sem rebarbas nas peças impressas.", "轻轻晃动无松动部件；打印件无毛刺。", "Nothing loose when shaken gently; no burrs on the printed parts."),
];

export const versionName = (v: SuporteVersion): Bilingual =>
  v === "v1"
    ? T("Versão 1 — alimentada por pilha de 9 V", "版本 1 — 9 V 电池供电", "Version 1 — powered by a 9 V battery")
    : T("Versão 2 — fonte 12 V com ajuste de brilho (dimmer)", "版本 2 — 12 V 电源，亮度可调（调光）", "Version 2 — 12 V supply with brightness control (dimmer)");

export const kindLabel = (kind: string): Bilingual =>
  kind === "impressa" ? T("impressa", "3D 打印", "printed") : kind === "referencia" ? T("fornecido (pregoscópio)", "客供（显微镜）", "supplied (pregoscope)") : T("comprada", "外购", "purchased");


/** Technical terms in the three languages: the reference for whoever reviews the translation. */
export const GLOSSARY: Bilingual[] = [
  T("ânodo (perna longa do LED)", "阳极（LED 长脚）", "anode (long leg of the LED)"),
  T("cátodo (perna curta do LED, lado da faixa do diodo)", "阴极（LED 短脚，二极管色环端）", "cathode (short leg of the LED, banded end of the diode)"),
  T("difusor", "扩散片", "diffuser"),
  T("lâmina de microscopia", "显微镜载玻片", "microscope slide"),
  T("objetiva", "物镜", "objective"),
  T("tubo externo / tubo interno", "外镜筒 / 内镜筒", "outer tube / inner tube"),
  T("abraçadeira", "抱箍", "clamp"),
  T("caixa luminosa", "灯箱", "light box"),
  T("tampa de fundo", "底盖", "bottom lid"),
  T("coluna", "立柱", "column"),
  T("porta-LED", "LED 座", "LED post"),
  T("berço da pilha", "电池仓", "battery cradle"),
  T("placa do driver", "驱动板", "driver board"),
  T("pad (ilha de solda)", "焊盘", "pad"),
  T("trilha", "走线", "trace"),
  T("solda fria", "虚焊", "cold joint"),
  T("termorretrátil", "热缩管", "heat-shrink tube"),
  T("multímetro", "万用表", "multimeter"),
  T("interruptor de balancim", "摇臂开关", "rocker switch"),
  T("conector de painel", "面板插座", "panel jack"),
  T("reostato", "电位器", "rheostat"),
  T("regulador de tensão", "稳压器", "voltage regulator"),
  T("resistor / capacitor / diodo", "电阻 / 电容 / 二极管", "resistor / capacitor / diode"),
  T("pilha de 9 V", "9 V 电池", "9 V battery"),
  T("fonte (adaptador de parede)", "电源适配器", "power adapter"),
  T("parafuso autoatarraxante", "自攻螺钉", "self-tapping screw"),
  T("furo-piloto", "底孔", "pilot hole"),
  T("gabarito de calibração", "校准件", "calibration jig"),
  T("tolerância", "公差", "tolerance"),
  T("primeiro diedro", "第一角投影", "first-angle projection"),
  T("corte / seção", "剖视", "section"),
  T("vista explodida", "爆炸图", "exploded view"),
  T("distância de trabalho", "工作距离", "working distance"),
  T("foco", "对焦", "focus"),
  T("escala do tubo interno", "内镜筒刻度", "scale of the inner tube"),
];
