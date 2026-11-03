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
