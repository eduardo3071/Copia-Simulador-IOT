export interface Series { name: string; id: string; sizes: string[]; param: string }
export const JIGS: { id: string; file: string; title: string; series: Series[] }[] = [
  { id: "G1", file: "calibracao-tubo.stl", title: "Gabarito do tubo", series: [
    { name: "Tubo externo", id: "P2", sizes: ["30,2", "33,0", "33,4", "33,8", "34,2", "34,6", "36,4"], param: "tubeDiameter = valor escolhido − 0,2" },
  ] },
  { id: "G2", file: "calibracao-pecas.stl", title: "Gabarito das peças", series: [
    { name: "Lâmina (rebaixo de 1,2 mm)", id: "L1", sizes: ["26,2", "26,4", "26,6", "26,8", "27,0"], param: "slideWidth = valor escolhido − 0,6" },
    { name: "Interruptor KCD1-101", id: "SW1", sizes: ["20,8×14,6", "21,0×14,8", "21,2×15,0", "21,4×15,2", "21,6×15,4"], param: "switchCutout (largura e altura)" },
    { name: "Flange do LED", id: "D1", sizes: ["5,8", "6,0", "6,2", "6,4", "6,6"], param: "ledFlange = valor escolhido − 0,4" },
    { name: "Furo-piloto M3", id: "H1", sizes: ["2,4", "2,6", "2,8"], param: "pilotHole (entra apertado e rosqueia)" },
    { name: "Conector DC-022B", id: "J1", sizes: ["7,6", "7,8", "8,0", "8,2"], param: "jackDiameter" },
    { name: "Rosca M7 do reostato", id: "RV1", sizes: ["7,0", "7,3", "7,5", "7,8"], param: "knobDiameter" },
  ] },
  { id: "G3", file: "calibracao-bateria.stl", title: "Gabarito da bateria", series: [
    { name: "Bateria 9 V", id: "BT1", sizes: ["48,6×26,6", "49,1×27,1", "49,6×27,6", "50,1×28,1"], param: "batteryFit = valor escolhido − medida da bateria" },
  ] },
];

/** Chinese and English of the texts above, keyed by the Portuguese string. */
export const JIG_TEXT: Record<string, { zh: string; en: string }> = {
  "Gabarito do tubo": { zh: "镜筒校准件", en: "Tube jig" },
  "Gabarito das peças": { zh: "零件校准件", en: "Parts jig" },
  "Gabarito da bateria": { zh: "电池校准件", en: "Battery jig" },
  "Tubo externo": { zh: "外镜筒", en: "Outer tube" },
  "Lâmina (rebaixo de 1,2 mm)": { zh: "载玻片（凹槽 1.2 mm）", en: "Slide (1.2 mm recess)" },
  "Interruptor KCD1-101": { zh: "开关 KCD1-101", en: "Switch KCD1-101" },
  "Flange do LED": { zh: "LED 法兰", en: "LED flange" },
  "Furo-piloto M3": { zh: "M3 底孔", en: "M3 pilot hole" },
  "Conector DC-022B": { zh: "插座 DC-022B", en: "Jack DC-022B" },
  "Rosca M7 do reostato": { zh: "电位器 M7 螺纹", en: "Rheostat M7 thread" },
  "Bateria 9 V": { zh: "9 V 电池", en: "9 V battery" },
  "tubeDiameter = valor escolhido − 0,2": { zh: "tubeDiameter = 选定值 − 0.2", en: "tubeDiameter = chosen value − 0.2" },
  "slideWidth = valor escolhido − 0,6": { zh: "slideWidth = 选定值 − 0.6", en: "slideWidth = chosen value − 0.6" },
  "switchCutout (largura e altura)": { zh: "switchCutout（宽和高）", en: "switchCutout (width and height)" },
  "ledFlange = valor escolhido − 0,4": { zh: "ledFlange = 选定值 − 0.4", en: "ledFlange = chosen value − 0.4" },
  "pilotHole (entra apertado e rosqueia)": { zh: "pilotHole（螺钉旋入时较紧并能攻丝）", en: "pilotHole (tight fit that still threads)" },
  "jackDiameter": { zh: "jackDiameter", en: "jackDiameter" },
  "knobDiameter": { zh: "knobDiameter", en: "knobDiameter" },
  "batteryFit = valor escolhido − medida da bateria": { zh: "batteryFit = 选定值 − 电池实测尺寸", en: "batteryFit = chosen value − battery measurement" },
};
