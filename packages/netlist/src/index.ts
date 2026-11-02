import { getDefinition, type ComponentDefinition, type PinDef } from "@simiot/component-catalog";
import type { ComponentInstance, Project, TerminalRef } from "@simiot/project-model";

export type TerminalKey = `${string}:${string}`;

export const terminalKey = (t: TerminalRef): TerminalKey => `${t.componentId}:${t.pinId}`;

export function parseTerminalKey(key: string): TerminalRef {
  const i = key.lastIndexOf(":");
  return { componentId: key.slice(0, i), pinId: key.slice(i + 1) };
}

export interface Net {
  /** Deterministic name derived from content (GND, 5V, D13, N1...). Not persisted. */
  id: string;
  terminals: TerminalRef[];
}

export interface Netlist {
  nets: Net[];
  netOf: Map<TerminalKey, string>;
  issues: string[];
}

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    let root = this.parent.get(x) ?? x;
    if (root !== x) {
      root = this.find(root);
      this.parent.set(x, root);
    }
    return root;
  }
  add(x: string) {
    if (!this.parent.has(x)) this.parent.set(x, x);
  }
  union(a: string, b: string) {
    this.add(a);
    this.add(b);
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  }
}

/** Name priority: ground, then supplies, then MCU signal pins. */
function pinName(def: ComponentDefinition, pin: PinDef): { name: string; rank: number } | undefined {
  if (def.category !== "board") return undefined;
  if (pin.role === "ground") return { name: "GND", rank: 0 };
  if (pin.role === "power") return { name: pin.label, rank: 1 };
  if (pin.role === "digital" || pin.role === "analog") return { name: pin.label, rank: 2 };
  return undefined;
}

/**
 * Electrical nets: user connections + connections internal to parts (breadboard
 * strips, button legs). Only terminals that are part of some connection, or that
 * are internally tied to one, are included, so the netlist stays small.
 */
export function buildNetlist(
  project: Pick<Project, "components" | "connections">,
  lookup: (id: string) => ComponentDefinition | undefined = getDefinition,
): Netlist {
  const uf = new UnionFind();
  const issues: string[] = [];
  const components = new Map<string, ComponentInstance>(project.components.map((c) => [c.id, c]));

  for (const conn of project.connections) {
    if (!components.has(conn.a.componentId) || !components.has(conn.b.componentId)) {
      issues.push(`Conexão ${conn.id} referencia componente inexistente.`);
      continue;
    }
    uf.union(terminalKey(conn.a), terminalKey(conn.b));
  }

  // Terminals used by a connection, plus every pin internally tied to one of them.
  const allKeys = new Set<TerminalKey>();
  for (const conn of project.connections) {
    allKeys.add(terminalKey(conn.a));
    allKeys.add(terminalKey(conn.b));
  }
  for (const component of project.components) {
    const def = lookup(component.definitionId);
    if (!def) {
      issues.push(`${component.refDes}: definição ${component.definitionId} não encontrada.`);
      continue;
    }
    for (const group of def.internalNets) {
      const keys = group.map((pinId): TerminalKey => `${component.id}:${pinId}`);
      if (!keys.some((k) => allKeys.has(k))) continue;
      for (const key of keys) {
        allKeys.add(key);
        uf.union(keys[0]!, key);
      }
    }
  }

  const groups = new Map<string, TerminalKey[]>();
  for (const key of allKeys) {
    const root = uf.find(key);
    const list = groups.get(root) ?? [];
    list.push(key);
    groups.set(root, list);
  }
  const named: { keys: TerminalKey[]; name?: string; rank: number; first: string }[] = [];
  for (const keys of groups.values()) {
    keys.sort();
    let best: { name: string; rank: number } | undefined;
    const names = new Set<string>();
    const ranks = new Set<number>();
    for (const key of keys) {
      const t = parseTerminalKey(key);
      const component = components.get(t.componentId);
      const def = component && lookup(component.definitionId);
      const pin = def?.pins.find((p) => p.id === t.pinId);
      const candidate = def && pin ? pinName(def, pin) : undefined;
      if (!candidate) continue;
      names.add(candidate.name);
      ranks.add(candidate.rank);
      if (!best || candidate.rank < best.rank) best = candidate;
    }
    if (ranks.has(0) && ranks.has(1)) {
      issues.push(`Curto-circuito entre alimentação e GND: ${[...names].join(", ")}.`);
    }
    named.push({ keys, first: keys[0]!, rank: best?.rank ?? 9, ...(best ? { name: best.name } : {}) });
  }

  named.sort((a, b) => (a.first < b.first ? -1 : a.first > b.first ? 1 : 0));
  const used = new Set<string>();
  let counter = 1;
  const nets: Net[] = [];
  const netOf = new Map<TerminalKey, string>();
  for (const entry of named) {
    let id = entry.name;
    if (!id || used.has(id)) {
      const base = id;
      if (base) {
        let n = 2;
        while (used.has(`${base}_${n}`)) n++;
        id = `${base}_${n}`;
      } else {
        while (used.has(`N${counter}`)) counter++;
        id = `N${counter}`;
      }
    }
    used.add(id);
    nets.push({ id, terminals: entry.keys.map(parseTerminalKey) });
    for (const key of entry.keys) netOf.set(key, id);
  }
  return { nets, netOf, issues };
}

/** Net id of a terminal, or undefined if the pin is not connected to anything. */
export function netOfTerminal(netlist: Netlist, componentId: string, pinId: string): string | undefined {
  return netlist.netOf.get(`${componentId}:${pinId}`);
}