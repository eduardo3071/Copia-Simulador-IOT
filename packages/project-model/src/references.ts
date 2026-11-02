import type { Project, TerminalRef } from "./schema.ts";

export interface ReferenceIssue {
  kind: "missing-component" | "missing-pin" | "missing-layout" | "dangling-layout" | "duplicate-id";
  message: string;
}

/**
 * Checks that every connection and layout entry points at something that exists.
 * `pinsOf` comes from the component catalog, keeping this package catalog-agnostic.
 */
export function checkReferences(
  project: Project,
  pinsOf: (definitionId: string) => readonly string[] | undefined,
): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  const components = new Map(project.components.map((c) => [c.id, c]));
  const seen = new Set<string>();
  for (const id of [...project.components.map((c) => c.id), ...project.connections.map((c) => c.id)]) {
    if (seen.has(id)) issues.push({ kind: "duplicate-id", message: `ID duplicado: ${id}` });
    seen.add(id);
  }
  const checkTerminal = (t: TerminalRef, connId: string) => {
    const component = components.get(t.componentId);
    if (!component) {
      issues.push({ kind: "missing-component", message: `${connId}: componente ${t.componentId} não existe` });
      return;
    }
    const pins = pinsOf(component.definitionId);
    if (!pins?.includes(t.pinId)) {
      issues.push({ kind: "missing-pin", message: `${connId}: pino ${t.pinId} não existe em ${component.refDes}` });
    }
  };
  for (const conn of project.connections) {
    checkTerminal(conn.a, conn.id);
    checkTerminal(conn.b, conn.id);
  }
  for (const c of project.components) {
    if (!project.breadboard.placements[c.id]) {
      issues.push({ kind: "missing-layout", message: `${c.refDes} sem posição na protoboard` });
    }
  }
  for (const id of Object.keys(project.breadboard.placements)) {
    if (!components.has(id)) issues.push({ kind: "dangling-layout", message: `Posição órfã: ${id}` });
  }
  return issues;
}
