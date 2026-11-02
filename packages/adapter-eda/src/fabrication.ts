import type { AnyCircuitElement } from "circuit-json";
import { convertCircuitJsonToGerberFiles } from "circuit-json-to-gerber";
import { convertBomRowsToCsv, convertCircuitJsonToBomRows } from "circuit-json-to-bom-csv";
import { convertCircuitJsonToPickAndPlaceCsv } from "circuit-json-to-pnp-csv";

export interface FabricationFile {
  path: string;
  content: string;
}

/**
 * Fabrication outputs. Every file starts with the project revision that produced it,
 * so a file can always be traced back to one project state.
 */
export async function fabricationFiles(
  circuitJson: AnyCircuitElement[],
  meta: { title: string; revision: number },
): Promise<FabricationFile[]> {
  const stamp = `Simulador-IOT | ${meta.title} | revisão ${meta.revision}`;
  const files: FabricationFile[] = [];
  const gerbers = convertCircuitJsonToGerberFiles(circuitJson) as Record<string, string>;
  for (const [name, content] of Object.entries(gerbers)) {
    const isDrill = /\.(drl|xln)$/i.test(name) || /drill/i.test(name);
    const header = isDrill ? `; ${stamp}\n` : `G04 ${stamp}*\n`;
    files.push({ path: `gerber/${name}`, content: insertAfterFirstLine(content, header, isDrill) });
  }
  const bomRows = await convertCircuitJsonToBomRows({ circuitJson });
  files.push({ path: "bom.csv", content: `# ${stamp}\n${convertBomRowsToCsv(bomRows)}` });
  files.push({ path: "pick-and-place.csv", content: `# ${stamp}\n${convertCircuitJsonToPickAndPlaceCsv(circuitJson)}` });
  files.push({ path: "circuit.json", content: JSON.stringify(circuitJson) });
  return files;
}

/** Excellon files must start with M48; the comment goes right after it. */
function insertAfterFirstLine(content: string, header: string, isDrill: boolean): string {
  if (!isDrill) return header + content;
  const firstBreak = content.indexOf("\n");
  return firstBreak < 0 ? content + "\n" + header : content.slice(0, firstBreak + 1) + header + content.slice(firstBreak + 1);
}