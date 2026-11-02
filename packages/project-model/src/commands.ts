import { DEFAULT_ENCLOSURE_PARAMS } from "./create.ts";
import { enclosureInputsKey } from "./derived.ts";
import {
  Cutout,
  EnclosureParams,
  type ComponentInstance,
  type Connection,
  type Enclosure,
  type MountingHole,
  type Placement,
  type Project,
  type TerminalRef,
} from "./schema.ts";

export type View = "breadboard" | "schematic" | "pcb";

export type Command =
  | { type: "setTitle"; title: string }
  | { type: "addComponent"; component: ComponentInstance; placement: Placement }
  | { type: "removeComponent"; componentId: string }
  | { type: "moveComponent"; view: View; componentId: string; placement: Placement }
  | { type: "connect"; connection: Connection; color?: string }
  | { type: "disconnect"; connectionId: string }
  | { type: "setParam"; componentId: string; key: string; value: string | number | boolean }
  | { type: "setFootprint"; componentId: string; footprint: string | undefined }
  | { type: "setWireColor"; connectionId: string; color: string }
  | { type: "editSource"; path: string; content: string }
  /** Pinned Arduino libraries the firmware uses (must match the server toolchain). */
  | { type: "setLibraries"; libraries: { name: string; version: string }[] }
  | { type: "setBoardSize"; width: number; height: number }
  | { type: "setMountingHoles"; holes: MountingHole[] }
  | { type: "createEnclosure"; params?: Partial<EnclosureParams> }
  | { type: "removeEnclosure" }
  | { type: "setEnclosureParams"; params: Partial<EnclosureParams> }
  | { type: "addCutout"; cutout: Cutout }
  | { type: "updateCutout"; cutoutId: string; changes: Partial<Omit<Cutout, "id">> }
  | { type: "removeCutout"; cutoutId: string }
  | { type: "batch"; label: string; commands: Command[] };

export class CommandError extends Error {}

const sameTerminal = (a: TerminalRef, b: TerminalRef) =>
  a.componentId === b.componentId && a.pinId === b.pinId;

export function connects(conn: Connection, a: TerminalRef, b: TerminalRef): boolean {
  return (sameTerminal(conn.a, a) && sameTerminal(conn.b, b)) ||
    (sameTerminal(conn.a, b) && sameTerminal(conn.b, a));
}

function requireComponent(project: Project, id: string): ComponentInstance {
  const component = project.components.find((c) => c.id === id);
  if (!component) throw new CommandError(`Componente ${id} não existe.`);
  return component;
}

function requireEnclosure(project: Project): Enclosure {
  if (!project.enclosure) throw new CommandError("O projeto não tem gabinete.");
  return project.enclosure;
}

function validParams(params: EnclosureParams): EnclosureParams {
  const parsed = EnclosureParams.safeParse(params);
  if (!parsed.success) throw new CommandError("Parâmetros do gabinete fora da faixa permitida.");
  return parsed.data;
}

function validCutout(cutout: Cutout): Cutout {
  const parsed = Cutout.safeParse(cutout);
  if (!parsed.success) throw new CommandError("Recorte inválido: dimensões devem ser positivas.");
  return parsed.data;
}

const withEnclosure = (project: Project, changes: Partial<Enclosure>): Project => ({
  ...project,
  enclosure: { ...requireEnclosure(project), ...changes },
});

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

/** Applies a command without touching revision/updatedAt (see applyCommand). */
function reduce(project: Project, command: Command): Project {
  switch (command.type) {
    case "setTitle":
      return { ...project, title: command.title };

    case "addComponent": {
      const { component, placement } = command;
      if (project.components.some((c) => c.id === component.id)) {
        throw new CommandError(`ID ${component.id} já existe.`);
      }
      return {
        ...project,
        components: [...project.components, component],
        breadboard: {
          ...project.breadboard,
          placements: { ...project.breadboard.placements, [component.id]: placement },
        },
      };
    }

    case "removeComponent": {
      requireComponent(project, command.componentId);
      const removed = project.connections.filter(
        (c) => c.a.componentId === command.componentId || c.b.componentId === command.componentId,
      );
      let wires = project.breadboard.wires;
      for (const conn of removed) wires = omit(wires, conn.id);
      return {
        ...project,
        components: project.components.filter((c) => c.id !== command.componentId),
        connections: project.connections.filter((c) => !removed.includes(c)),
        breadboard: {
          ...project.breadboard,
          placements: omit(project.breadboard.placements, command.componentId),
          wires,
        },
        schematic: {
          ...project.schematic,
          placements: omit(project.schematic.placements, command.componentId),
        },
        pcb: { ...project.pcb, placements: omit(project.pcb.placements, command.componentId) },
      };
    }

    case "moveComponent": {
      requireComponent(project, command.componentId);
      const { view, componentId, placement } = command;
      if (view === "pcb") {
        const layer = project.pcb.placements[componentId]?.layer ?? "top";
        return {
          ...project,
          pcb: { ...project.pcb, placements: { ...project.pcb.placements, [componentId]: { ...placement, layer } } },
        };
      }
      const layout = project[view];
      return {
        ...project,
        [view]: { ...layout, placements: { ...layout.placements, [componentId]: placement } },
      };
    }

    case "connect": {
      const { connection } = command;
      requireComponent(project, connection.a.componentId);
      requireComponent(project, connection.b.componentId);
      if (sameTerminal(connection.a, connection.b)) {
        throw new CommandError("Não é possível ligar um pino a ele mesmo.");
      }
      if (project.connections.some((c) => c.id === connection.id)) {
        throw new CommandError(`ID ${connection.id} já existe.`);
      }
      if (project.connections.some((c) => connects(c, connection.a, connection.b))) {
        return project; // already connected: idempotent
      }
      const wires = connection.kind === "wire"
        ? { ...project.breadboard.wires, [connection.id]: { color: command.color ?? "green", points: [] } }
        : project.breadboard.wires;
      return {
        ...project,
        connections: [...project.connections, connection],
        breadboard: { ...project.breadboard, wires },
      };
    }

    case "disconnect": {
      if (!project.connections.some((c) => c.id === command.connectionId)) {
        throw new CommandError(`Conexão ${command.connectionId} não existe.`);
      }
      return {
        ...project,
        connections: project.connections.filter((c) => c.id !== command.connectionId),
        breadboard: { ...project.breadboard, wires: omit(project.breadboard.wires, command.connectionId) },
      };
    }

    case "setParam": {
      requireComponent(project, command.componentId);
      return {
        ...project,
        components: project.components.map((c) =>
          c.id === command.componentId ? { ...c, params: { ...c.params, [command.key]: command.value } } : c,
        ),
      };
    }

    case "setFootprint": {
      requireComponent(project, command.componentId);
      return {
        ...project,
        components: project.components.map((c) => {
          if (c.id !== command.componentId) return c;
          const { footprint: _old, ...rest } = c;
          return command.footprint === undefined ? rest : { ...rest, footprint: command.footprint };
        }),
      };
    }

    case "setWireColor": {
      const wire = project.breadboard.wires[command.connectionId];
      if (!wire) throw new CommandError(`Fio ${command.connectionId} não existe.`);
      return {
        ...project,
        breadboard: {
          ...project.breadboard,
          wires: { ...project.breadboard.wires, [command.connectionId]: { ...wire, color: command.color } },
        },
      };
    }

    case "editSource": {
      const exists = project.firmware.files.some((f) => f.path === command.path);
      const files = exists
        ? project.firmware.files.map((f) => (f.path === command.path ? { ...f, content: command.content } : f))
        : [...project.firmware.files, { path: command.path, content: command.content }];
      return { ...project, firmware: { ...project.firmware, files } };
    }

    case "setLibraries": {
      const names = command.libraries.map((l) => l.name);
      if (new Set(names).size !== names.length) throw new CommandError("Biblioteca duplicada.");
      return { ...project, firmware: { ...project.firmware, libraries: [...command.libraries].sort((x, y) => (x.name < y.name ? -1 : 1)) } };
    }

    case "setBoardSize": {
      if (!(command.width > 0 && command.height > 0)) {
        throw new CommandError("Dimensões da placa devem ser positivas.");
      }
      return { ...project, pcb: { ...project.pcb, board: { width: command.width, height: command.height } } };
    }

    case "setMountingHoles": {
      const ids = new Set(command.holes.map((h) => h.id));
      if (ids.size !== command.holes.length) throw new CommandError("IDs de furos repetidos.");
      if (command.holes.some((h) => !(h.diameter > 0))) throw new CommandError("Diâmetro do furo deve ser positivo.");
      return { ...project, pcb: { ...project.pcb, mountingHoles: command.holes } };
    }

    case "createEnclosure": {
      if (project.enclosure) throw new CommandError("O projeto já tem gabinete.");
      return {
        ...project,
        enclosure: {
          params: validParams({ ...DEFAULT_ENCLOSURE_PARAMS, ...command.params }),
          cutouts: [],
          pcbInputsKey: enclosureInputsKey(project),
          sourceRevision: project.revision,
        },
      };
    }

    case "removeEnclosure":
      requireEnclosure(project);
      return { ...project, enclosure: null };

    case "setEnclosureParams": {
      const { params } = requireEnclosure(project);
      return withEnclosure(project, { params: validParams({ ...params, ...command.params }) });
    }

    case "addCutout": {
      const { cutouts } = requireEnclosure(project);
      if (cutouts.some((c) => c.id === command.cutout.id)) {
        throw new CommandError(`ID ${command.cutout.id} já existe.`);
      }
      return withEnclosure(project, { cutouts: [...cutouts, validCutout(command.cutout)] });
    }

    case "updateCutout": {
      const { cutouts } = requireEnclosure(project);
      const current = cutouts.find((c) => c.id === command.cutoutId);
      if (!current) throw new CommandError(`Recorte ${command.cutoutId} não existe.`);
      const updated = validCutout({ ...current, ...command.changes, id: current.id });
      return withEnclosure(project, { cutouts: cutouts.map((c) => (c === current ? updated : c)) });
    }

    case "removeCutout": {
      const { cutouts } = requireEnclosure(project);
      if (!cutouts.some((c) => c.id === command.cutoutId)) {
        throw new CommandError(`Recorte ${command.cutoutId} não existe.`);
      }
      return withEnclosure(project, { cutouts: cutouts.filter((c) => c.id !== command.cutoutId) });
    }

    case "batch":
      return command.commands.reduce(reduce, project);
  }
}

/** Applies a user edit: one command = one new revision. */
export function applyCommand(project: Project, command: Command, now = new Date()): Project {
  const next = reduce(project, command);
  if (next === project) return project;
  return { ...next, revision: project.revision + 1, updatedAt: now.toISOString() };
}