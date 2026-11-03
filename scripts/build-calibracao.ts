// Calibration plates for the pregoscopio holder: a few minutes of printing replace most of the caliper work.
// Each series of holes grows from left to right; the number of dots above a hole is its position in the series.
// Writes pacote-montagem/mecanica/calibracao/. Run: npx tsx scripts/build-calibracao.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import opencascade from "replicad-opencascadejs";
import { makeBox, makeCylinder, setOC, type Shape3D } from "replicad";
import { stlOf } from "../packages/adapter-cad/src/geometry.ts";
import { withStlHeader } from "../packages/adapter-cad/src/index.ts";

const require = createRequire(import.meta.url);
setOC(await opencascade({ wasmBinary: readFileSync(require.resolve("replicad-opencascadejs/wasm")) }));

const THICKNESS = 3;
const DOT = { diameter: 2, height: 0.6, pitch: 4 };

export interface Series {
  name: string;
  /** Hole sizes: a diameter, or width x height for rectangles. */
  sizes: (number | [number, number])[];
  kind: "round" | "rect" | "slot";
  /** What to try in the hole. */
  uses: string;
}

export const TUBE_SERIES: Series = {
  name: "tubo",
  kind: "round",
  sizes: [30.2, 33.0, 33.4, 33.8, 34.2, 34.6, 36.4],
  uses: "tubo externo do pregoscópio (o menor furo em que ele desliza sem folga); 30,2 e 36,4 cobrem as medidas do STEP V1 (30 e 36 mm)",
};
export const PLATE_SERIES: Series[] = [
  { name: "lamina", kind: "slot", sizes: [26.2, 26.4, 26.6, 26.8, 27.0], uses: "lâmina de microscopia deitada no rebaixo (a largura que a deixa deslizar sem folga; profundidade 1,2 mm)" },
  { name: "interruptor", kind: "rect", sizes: [[20.8, 14.6], [21.0, 14.8], [21.2, 15.0], [21.4, 15.2], [21.6, 15.4]], uses: "interruptor de balancim KCD1-101 (recorte padrão 21,2 x 15,0 mm segundo guia da LCSC)" },
  { name: "led", kind: "round", sizes: [5.8, 6.0, 6.2, 6.4, 6.6], uses: "flange do LED de 5 mm (sede do porta-LED)" },
  { name: "parafuso-m3", kind: "round", sizes: [2.4, 2.6, 2.8], uses: "parafuso M3 autoatarraxante (furo-piloto)" },
  { name: "conector-dc", kind: "round", sizes: [7.6, 7.8, 8.0, 8.2], uses: "rosca do conector DC-022B de painel (furo de 7,8 mm segundo anúncios de venda)" },
  { name: "eixo-reostato", kind: "round", sizes: [7.0, 7.3, 7.5, 7.8], uses: "rosca M7 do reostato WH148 (v2)" },
];

export const BATTERY_SERIES: Series = { name: "bateria", kind: "rect", sizes: [[48.6, 26.6], [49.1, 27.1], [49.6, 27.6], [50.1, 28.1]], uses: "bateria 9 V (48,5 x 26,5 mm) no berço da tampa" };

const widthOf = (s: number | [number, number]) => (Array.isArray(s) ? s[0] : s);
const heightOf = (s: number | [number, number]) => (Array.isArray(s) ? s[1] : s);

/** One plate with the series as rows; cells are `pitch` wide so the walls between holes stay >= 3 mm. */
function plateFor(series: Series[], pitch: number, rowHeight: number): Shape3D {
  const columns = Math.max(...series.map((s) => s.sizes.length));
  const width = columns * pitch + 4;
  const depth = series.length * rowHeight + 4;
  let plate: Shape3D = makeBox([0, 0, 0], [width, depth, THICKNESS]);
  series.forEach((s, row) => {
    const cy = depth - 2 - rowHeight * (row + 0.5);
    s.sizes.forEach((size, col) => {
      const cx = 2 + pitch * (col + 0.5);
      const w = widthOf(size);
      const h = heightOf(size);
      if (s.kind === "round") {
        plate = plate.cut(makeCylinder(w / 2, THICKNESS + 2, [cx, cy - 2, -1]));
      } else if (s.kind === "rect") {
        plate = plate.cut(makeBox([cx - w / 2, cy - 2 - h / 2, -1], [cx + w / 2, cy - 2 + h / 2, THICKNESS + 1]));
      } else {
        // slide slot: blind, 1.2 mm deep, 30 mm long along X
        plate = plate.cut(makeBox([cx - 15, cy - 2 - w / 2, THICKNESS - 1.2], [cx + 15, cy - 2 + w / 2, THICKNESS + 1]));
      }
      // position marker: col+1 dots on top, above the hole
      for (let d = 0; d <= col; d++) {
        const dx = cx + (d - col / 2) * DOT.pitch;
        plate = plate.fuse(makeCylinder(DOT.diameter / 2, DOT.height + 0.3, [dx, cy + rowHeight / 2 - 3, THICKNESS - 0.3]));
      }
    });
  });
  return plate;
}

const out = new URL("../pacote-montagem/mecanica/calibracao/", import.meta.url);
mkdirSync(out, { recursive: true });
const write = async (name: string, shape: Shape3D) =>
  writeFileSync(new URL(name, out), Buffer.from(withStlHeader(await stlOf(shape), `Calibracao ${name}`)));

await write("calibracao-tubo.stl", plateFor([TUBE_SERIES], 38, 44));
await write("calibracao-pecas.stl", plateFor(PLATE_SERIES, 34, 34));
await write("calibracao-bateria.stl", plateFor([BATTERY_SERIES], 62, 38));
const table = [TUBE_SERIES, ...PLATE_SERIES, BATTERY_SERIES].map((s) => ({ ...s, sizes: s.sizes.map((x) => (Array.isArray(x) ? `${x[0]}x${x[1]}` : x)) }));
writeFileSync(new URL("series.json", out), `${JSON.stringify(table, null, 2)}\n`);
console.log("calibracao-tubo.stl, calibracao-pecas.stl, calibracao-bateria.stl, series.json");
