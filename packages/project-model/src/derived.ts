import { hashOf } from "./hash.ts";
import type { ArtifactRef, Project } from "./schema.ts";

/** Everything the compiled firmware depends on. */
export function firmwareInputsKey(project: Project): string {
  const { fqbn, core, mainFile, files, libraries } = project.firmware;
  return hashOf({ fqbn, core, mainFile, files, libraries });
}

/** Everything the schematic/PCB depend on: components, connectivity and PCB layout. */
export function circuitInputsKey(project: Project): string {
  return hashOf({
    components: project.components,
    connections: project.connections,
    pcb: project.pcb,
    schematic: project.schematic,
  });
}

export function isStale(artifact: ArtifactRef | undefined, currentInputsKey: string): boolean {
  return !artifact || artifact.inputsKey !== currentInputsKey;
}

/**
 * Everything an enclosure is fitted to: board outline, mounting holes and the parts
 * on the board (moving a connector can leave a manual cutout in the wrong place).
 * Schematic, breadboard, wiring and firmware do not affect it.
 */
export function enclosureInputsKey(project: Project): string {
  return hashOf({
    pcb: project.pcb,
    parts: project.components.map(({ id, definitionId, definitionVersion, footprint }) => ({ id, definitionId, definitionVersion, footprint })),
  });
}

export function enclosureIsStale(project: Project): boolean {
  return !!project.enclosure && project.enclosure.pcbInputsKey !== enclosureInputsKey(project);
}

/**
 * Records that the enclosure geometry was regenerated from the current PCB.
 * Derived data, like a compiled firmware: no new revision and no undo step.
 */
export function markEnclosureGenerated(project: Project): Project {
  if (!project.enclosure) return project;
  return {
    ...project,
    enclosure: { ...project.enclosure, pcbInputsKey: enclosureInputsKey(project), sourceRevision: project.revision },
  };
}
