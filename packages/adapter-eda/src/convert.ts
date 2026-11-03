import { createElement as h, type ReactElement } from "react";
import { Circuit } from "@tscircuit/core";
import type { AnyCircuitElement } from "circuit-json";
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg";
import { getDefinition, type ComponentDefinition } from "@simiot/component-catalog";
import { buildNetlist, parseTerminalKey, terminalKey } from "@simiot/netlist";
import { circuitInputsKey, type ComponentInstance, type Project } from "@simiot/project-model";

export interface EdaPart {
  componentId: string;
  /** Name of the component in the circuit (R1, D1, J1...). */
  name: string;
  /** Project pin id -> tscircuit port name. */
  ports: Record<string, string>;
}

export interface EdaResult {
  circuitJson: AnyCircuitElement[];
  /** Schematic rendered by circuit-to-svg. */
  schematicSvg: string;
  /** Project revision and inputs this result was generated from. */
  sourceRevision: number;
  inputsKey: string;
  parts: EdaPart[];
  /** Net id -> "R1.pin1"-style port references actually placed on the board. */
  nets: Record<string, string[]>;
  /** Limitations of this conversion, in the user's language. */
  notes: string[];
  /** Problems reported by tscircuit (errors and warnings), simplified. */
  diagnostics: { type: string; message: string; severity: "error" | "warning" }[];
  autoPlaced: boolean;
}

/** tscircuit net names must be identifiers: 5V -> V5, 3.3V -> V3V3. */
export function edaNetName(netId: string): string {
  const cleaned = /^\d/.test(netId) ? `V${netId.replace(/V$/, "").replace(".", "V")}` : netId;
  return cleaned.replace(/[^A-Za-z0-9_]/g, "_");
}

const number = (value: unknown, fallback: number) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** One-way conversion: project connectivity -> tscircuit board -> Circuit JSON. */
export async function projectToCircuitJson(
  project: Project,
  lookup: (id: string) => ComponentDefinition | undefined = getDefinition,
): Promise<EdaResult> {
  const netlist = buildNetlist(project, lookup);
  const notes: string[] = [...netlist.issues];
  const parts: EdaPart[] = [];
  const children: ReactElement[] = [];
  const usedNames = new Set<string>();
  const placements = project.pcb.placements;

  const edaComponents = project.components.filter((c) => {
    const def = lookup(c.definitionId);
    if (!def) return false;
    if (def.eda.kind === "none") return false;
    if (!def.capabilities.fabricable) {
      notes.push(`${c.refDes} (${def.name}) não tem footprint verificado e ficou fora da PCB.`);
      return false;
    }
    return true;
  });
  const autoPlaced = edaComponents.some((c) => !placements[c.id]);
  if (autoPlaced && edaComponents.length) notes.push("Posições na PCB calculadas automaticamente (empacotamento). Fixe-as para editar.");

  for (const component of edaComponents) {
    const def = lookup(component.definitionId)!;
    const footprint = component.footprint ?? def.eda.footprints[0];
    const placement = placements[component.id];
    const position: Record<string, number> = placement && !autoPlaced ? { pcbX: placement.x, pcbY: placement.y, pcbRotation: placement.rotation } : {};
    const element = partElement(component, def, footprint, position, netlist.netOf, usedNames, notes);
    if (!element) continue;
    parts.push(element.part);
    children.push(element.node);
  }

  // Connectivity: every port goes to its named net, so labels match the lab.
  const nets: Record<string, string[]> = {};
  for (const part of parts) {
    for (const [pinId, port] of Object.entries(part.ports)) {
      const netId = netlist.netOf.get(terminalKey({ componentId: part.componentId, pinId }));
      if (!netId) continue;
      (nets[netId] ??= []).push(`${part.name}.${port}`);
    }
  }
  for (const [netId, ports] of Object.entries(nets)) {
    if (ports.length < 2) {
      notes.push(`Net ${netId} tem só uma ligação na PCB (${ports[0]}); as demais pontas estão em peças fora da placa.`);
      delete nets[netId];
      continue;
    }
    const name = edaNetName(netId);
    children.push(h("net", { name }));
    for (const ref of ports) {
      const [part, port] = ref.split(".");
      children.push(h("trace", { from: `.${part} > .${port}`, to: `net.${name}` }));
    }
  }

  for (const hole of project.pcb.mountingHoles) {
    children.push(h("hole", { name: hole.id, diameter: hole.diameter, pcbX: hole.x, pcbY: hole.y }));
  }

  const circuit = new Circuit();
  circuit.add(
    h(
      "board",
      {
        width: project.pcb.board.width,
        height: project.pcb.board.height,
        ...(autoPlaced ? { pcbPack: true } : {}),
      },
      ...children,
    ),
  );
  await circuit.renderUntilSettled();
  const circuitJson = circuit.getCircuitJson() as AnyCircuitElement[];

  const diagnostics = circuitJson
    .filter((e) => e.type.endsWith("_error") || e.type.endsWith("_warning"))
    .filter((e) => !e.type.includes("manufacturer_part_number") && !e.type.includes("missing_sheet"))
    .map((e) => ({
      type: e.type,
      message: String((e as { message?: unknown }).message ?? e.type),
      severity: e.type.endsWith("_error") ? ("error" as const) : ("warning" as const),
    }));

  if (diagnostics.some((d) => d.type === "pcb_packing_error")) {
    notes.push(`A placa de ${project.pcb.board.width}×${project.pcb.board.height} mm não comporta as peças; aumente o tamanho da placa.`);
  }

  let schematicSvg = "";
  try {
    schematicSvg = convertCircuitJsonToSchematicSvg(circuitJson);
  } catch (error) {
    notes.push(`Falha ao desenhar o esquemático: ${String(error)}`);
  }

  return {
    circuitJson,
    schematicSvg,
    sourceRevision: project.revision,
    inputsKey: circuitInputsKey(project),
    parts,
    nets,
    notes,
    diagnostics,
    autoPlaced,
  };
}

/** Catalog internal nets expressed as tscircuit port names (e.g. button legs). */
function internalPortGroups(def: ComponentDefinition): string[][] {
  return def.internalNets.map((group) => group.map((pinId) => def.pins.find((p) => p.id === pinId)!.edaPort!));
}

/** Pin labels must be identifiers: COM.1 -> COM_1, V+ -> Vplus. */
const edaLabel = (id: string) => id.replace("+", "plus").replace(/[^A-Za-z0-9_]/g, "_");
const portNumber = (port: string) => Number(port.replace(/\D/g, ""));

function uniqueName(base: string, used: Set<string>): string {
  let name = base.replace(/[^A-Za-z0-9_]/g, "_");
  let n = 2;
  while (used.has(name)) name = `${base}_${n++}`;
  used.add(name);
  return name;
}

function partElement(
  component: ComponentInstance,
  def: ComponentDefinition,
  footprint: string | undefined,
  position: Record<string, number>,
  netOf: Map<string, string>,
  usedNames: Set<string>,
  notes: string[],
): { part: EdaPart; node: ReactElement } | undefined {
  const base = { footprint, ...position };
  const directPorts = () => Object.fromEntries(def.pins.filter((p) => p.edaPort).map((p) => [p.id, p.edaPort!]));

  switch (def.eda.kind) {
    case "resistor": {
      const name = uniqueName(component.refDes, usedNames);
      return {
        part: { componentId: component.id, name, ports: directPorts() },
        node: h("resistor", { ...base, name, resistance: number(component.params.resistance, 220) }),
      };
    }
    case "led": {
      const name = uniqueName(component.refDes, usedNames);
      return {
        part: { componentId: component.id, name, ports: directPorts() },
        node: h("led", { ...base, name, color: String(component.params.color ?? "red") }),
      };
    }
    case "diode": {
      const name = uniqueName(component.refDes, usedNames);
      return {
        part: { componentId: component.id, name, ports: directPorts() },
        node: h("diode", { ...base, name }),
      };
    }
    case "pushbutton": {
      const name = uniqueName(component.refDes, usedNames);
      return {
        part: { componentId: component.id, name, ports: directPorts() },
        node: h("pushbutton", { ...base, name, internallyConnectedPins: internalPortGroups(def) }),
      };
    }
    case "potentiometer": {
      const name = uniqueName(component.refDes, usedNames);
      return {
        part: { componentId: component.id, name, ports: directPorts() },
        node: h("potentiometer", { ...base, name, maxResistance: number(component.params.resistance, 10_000), pinVariant: "three_pin" }),
      };
    }
    case "capacitor": {
      const name = uniqueName(component.refDes, usedNames);
      return {
        part: { componentId: component.id, name, ports: directPorts() },
        node: h("capacitor", { ...base, name, capacitance: `${number(component.params.capacitance, 100)}nF` }),
      };
    }
    case "chip": {
      // generic part: explicit footprint, pins labelled with the catalog pin ids
      const name = uniqueName(component.refDes, usedNames);
      const internal = internalPortGroups(def);
      return {
        part: { componentId: component.id, name, ports: directPorts() },
        node: h("chip", {
          ...base,
          name,
          pinLabels: Object.fromEntries(def.pins.map((p) => [p.edaPort!, edaLabel(p.id)])),
          ...(internal.length ? { internallyConnectedPins: internal } : {}),
        }),
      };
    }
    case "module": {
      // off-board module or cable: the board gets the header it plugs into, every pin in order
      const name = uniqueName(`J_${component.refDes}`, usedNames);
      const ordered = [...def.pins].sort((a, b) => portNumber(a.edaPort!) - portNumber(b.edaPort!));
      notes.push(`${component.refDes} (${def.name}) fica fora da placa; a PCB recebe o conector ${name} com ${ordered.length} pinos.`);
      return {
        part: { componentId: component.id, name, ports: directPorts() },
        node: h("pinheader", { ...base, name, pinCount: ordered.length, pinLabels: ordered.map((p) => edaLabel(p.id)) }),
      };
    }    case "connector": {
      // Only pins that are wired become header pins; internally tied pins (GND.1/2/3) share one.
      const pins: { pinIds: string[]; label: string }[] = [];
      const byNet = new Map<string, { pinIds: string[]; label: string }>();
      for (const pin of def.pins) {
        const netId = netOf.get(`${component.id}:${pin.id}`);
        if (!netId) continue;
        const existing = byNet.get(netId);
        if (existing) {
          existing.pinIds.push(pin.id);
          continue;
        }
        const entry = { pinIds: [pin.id], label: pin.label };
        byNet.set(netId, entry);
        pins.push(entry);
      }
      if (pins.length === 0) {
        notes.push(`${component.refDes} não tem pinos ligados; conector omitido da PCB.`);
        return undefined;
      }
      const name = uniqueName(`J_${component.refDes}`, usedNames);
      const ports: Record<string, string> = {};
      pins.forEach((entry, i) => {
        for (const pinId of entry.pinIds) if (pinId === entry.pinIds[0]) ports[pinId] = `pin${i + 1}`;
      });
      notes.push(`${component.refDes} (${def.name}) aparece na PCB como conector ${name} com ${pins.length} pino(s).`);
      return {
        part: { componentId: component.id, name, ports },
        node: h("pinheader", {
          ...base,
          name,
          pinCount: pins.length,
          footprint: `pinrow${pins.length}`,
          pinLabels: pins.map((p) => p.label.replace(/[^A-Za-z0-9_]/g, "_")),
        }),
      };
    }
    case "none":
      return undefined;
  }
}

export { parseTerminalKey };