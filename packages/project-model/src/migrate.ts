import { Project, SCHEMA_VERSION } from "./schema.ts";

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * migrations[n] upgrades a document from schemaVersion n to n + 1.
 * Steps only reshape the document; Project.parse() validates the result.
 */
const migrations: Record<number, Migration> = {
  /** v2 adds the enclosure (phase 5); existing projects start without one. */
  1: (doc) => ({ ...doc, enclosure: null }),
};

export class MigrationError extends Error {}

/** Parse any stored/imported project document and bring it to the current schema. */
export function migrate(input: unknown): Project {
  if (typeof input !== "object" || input === null) {
    throw new MigrationError("Projeto inválido: esperado um objeto JSON.");
  }
  let doc = structuredClone(input) as Record<string, unknown>;
  let version = doc.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new MigrationError("Projeto sem schemaVersion válido.");
  }
  if (version > SCHEMA_VERSION) {
    throw new MigrationError(
      `Projeto criado com schemaVersion ${version}, mais nova que a suportada (${SCHEMA_VERSION}).`,
    );
  }
  while (version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) throw new MigrationError(`Falta migração da versão ${version}.`);
    doc = step(doc);
    version += 1;
    doc.schemaVersion = version;
  }
  return Project.parse(doc);
}
