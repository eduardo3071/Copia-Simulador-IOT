import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { migrate, type Project } from "@simiot/project-model";

export interface ProjectSummary {
  id: string;
  title: string;
  revision: number;
  updatedAt: string;
}

export class RevisionConflictError extends Error {
  constructor(readonly storedRevision: number) {
    super(`O projeto foi alterado em outro lugar (revisão ${storedRevision}).`);
  }
}

/**
 * Project metadata + document in SQLite. The document is stored as JSON and always
 * passes through migrate() on the way in and out.
 */
export class ProjectStore {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        revision INTEGER NOT NULL,
        schema_version INTEGER NOT NULL,
        document TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  list(): ProjectSummary[] {
    return this.db
      .prepare("SELECT id, title, revision, updated_at AS updatedAt FROM projects ORDER BY updated_at DESC")
      .all() as unknown as ProjectSummary[];
  }

  get(id: string): Project | undefined {
    const row = this.db.prepare("SELECT document FROM projects WHERE id = ?").get(id) as { document: string } | undefined;
    return row ? migrate(JSON.parse(row.document)) : undefined;
  }

  insert(project: Project): Project {
    const valid = migrate(project);
    this.db
      .prepare("INSERT INTO projects (id, title, revision, schema_version, document, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(valid.id, valid.title, valid.revision, valid.schemaVersion, JSON.stringify(valid), valid.createdAt, valid.updatedAt);
    return valid;
  }

  /** Saves only if the incoming document is not older than the stored one. */
  save(project: Project): Project {
    const valid = migrate(project);
    const row = this.db.prepare("SELECT revision FROM projects WHERE id = ?").get(valid.id) as { revision: number } | undefined;
    if (!row) return this.insert(valid);
    if (row.revision > valid.revision) throw new RevisionConflictError(row.revision);
    this.db
      .prepare("UPDATE projects SET title = ?, revision = ?, schema_version = ?, document = ?, updated_at = ? WHERE id = ?")
      .run(valid.title, valid.revision, valid.schemaVersion, JSON.stringify(valid), valid.updatedAt, valid.id);
    return valid;
  }

  close() {
    this.db.close();
  }
}