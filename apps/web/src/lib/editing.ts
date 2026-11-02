import {
  breadboardContacts,
  defaultParams,
  getDefinition,
  getPin,
  nextRefDes,
  requireDefinition,
} from "@simiot/component-catalog";
import { newId, type Command, type Placement, type Project, type TerminalRef } from "@simiot/project-model";

const isBoard = (project: Project, componentId: string) =>
  project.components.find((c) => c.id === componentId)?.definitionId === "breadboard-half";

/** Contacts (inserted legs) that should exist for `componentId` at `placement`. */
function contactCommands(project: Project, componentId: string, placement: Placement): Command[] {
  const component = project.components.find((c) => c.id === componentId);
  const def = component && getDefinition(component.definitionId);
  if (!component || !def || def.visual.kind === "breadboard") return [];
  const commands: Command[] = [];
  for (const conn of project.connections) {
    if (conn.kind === "contact" && (conn.a.componentId === componentId || conn.b.componentId === componentId)) {
      commands.push({ type: "disconnect", connectionId: conn.id });
    }
  }
  for (const board of project.components.filter((c) => c.definitionId === "breadboard-half")) {
    const boardPlacement = project.breadboard.placements[board.id];
    if (!boardPlacement) continue;
    for (const { pinId, holeId } of breadboardContacts(def, placement, getDefinition(board.definitionId)!, boardPlacement)) {
      commands.push({
        type: "connect",
        connection: { id: newId("conn"), kind: "contact", a: { componentId, pinId }, b: { componentId: board.id, pinId: holeId } },
      });
    }
  }
  return commands;
}

/**
 * Moving a part re-evaluates which legs are inserted; moving a breadboard carries
 * the parts inserted in it, so their contacts are preserved.
 */
export function movePart(project: Project, componentId: string, placement: Placement): Command {
  const commands: Command[] = [{ type: "moveComponent", view: "breadboard", componentId, placement }];
  if (isBoard(project, componentId)) {
    const old = project.breadboard.placements[componentId]!;
    const dx = placement.x - old.x;
    const dy = placement.y - old.y;
    const carried = new Set<string>();
    for (const conn of project.connections) {
      if (conn.kind !== "contact") continue;
      if (conn.b.componentId === componentId) carried.add(conn.a.componentId);
      if (conn.a.componentId === componentId) carried.add(conn.b.componentId);
    }
    for (const id of carried) {
      const p = project.breadboard.placements[id];
      if (p) commands.push({ type: "moveComponent", view: "breadboard", componentId: id, placement: { ...p, x: p.x + dx, y: p.y + dy } });
    }
  } else {
    commands.push(...contactCommands(project, componentId, placement));
  }
  return { type: "batch", label: "Mover", commands };
}

export function addPart(project: Project, definitionId: string, at: { x: number; y: number }): { command: Command; id: string } {
  const def = requireDefinition(definitionId);
  const id = newId("cmp");
  const placement = { x: Math.round(at.x), y: Math.round(at.y), rotation: 0 };
  const refDes = nextRefDes(def, project.components.map((c) => c.refDes));
  const add: Command = {
    type: "addComponent",
    component: { id, definitionId: def.id, definitionVersion: def.version, refDes, params: defaultParams(def) },
    placement,
  };
  const withPart = { ...project, components: [...project.components, add.component], breadboard: { ...project.breadboard, placements: { ...project.breadboard.placements, [id]: placement } } };
  return { id, command: { type: "batch", label: `Adicionar ${refDes}`, commands: [add, ...contactCommands(withPart, id, placement)] } };
}

export function rotatePart(project: Project, componentId: string): Command | undefined {
  const p = project.breadboard.placements[componentId];
  if (!p || isBoard(project, componentId)) return undefined;
  return movePart(project, componentId, { ...p, rotation: (p.rotation + 90) % 360 });
}

/** Conventional jumper colours: black for ground, red for supply. */
export function wireColor(project: Project, a: TerminalRef, b: TerminalRef, fallback: string): string {
  const roles = [a, b].map((t) => {
    const c = project.components.find((x) => x.id === t.componentId);
    const def = c && getDefinition(c.definitionId);
    return def && getPin(def, t.pinId)?.role;
  });
  if (roles.includes("ground")) return "black";
  if (roles.includes("power")) return "red";
  return fallback;
}

export function terminalLabel(project: Project, t: TerminalRef): string {
  const c = project.components.find((x) => x.id === t.componentId);
  const def = c && getDefinition(c.definitionId);
  const pin = def && getPin(def, t.pinId);
  return `${c?.refDes ?? "?"}.${pin?.label ?? t.pinId}`;
}