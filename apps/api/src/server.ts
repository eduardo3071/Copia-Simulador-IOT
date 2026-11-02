import Fastify, { type FastifyInstance } from "fastify";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { z } from "zod";
import { fabricationFiles, projectToCircuitJson } from "@simiot/adapter-eda";
import { pinIdsOf } from "@simiot/component-catalog";
import { Compiler, REPO_ROOT, toolchain } from "@simiot/compiler";
import {
  checkReferences,
  createProject,
  migrate,
  MigrationError,
  newId,
  type Project,
} from "@simiot/project-model";
import { CompileQueue, QueueFullError } from "./jobs.ts";
import { Mutex } from "./mutex.ts";
import { ProjectStore, RevisionConflictError } from "./store.ts";

export interface ServerOptions {
  dbPath?: string;
  compiler?: Compiler;
  logger?: boolean;
}

const HASH = /^[0-9a-f]{64}$/;
const FIXTURES_DIR = join(REPO_ROOT, "fixtures");

const FirmwareBody = z.object({
  fqbn: z.string().max(100),
  core: z.string().max(100),
  mainFile: z.string().max(100),
  files: z.array(z.object({ path: z.string().max(100), content: z.string() })).min(1).max(20),
  libraries: z.array(z.object({ name: z.string(), version: z.string() })).max(20),
});

const CreateBody = z.object({
  title: z.string().min(1).max(200).optional(),
  fixture: z.string().regex(/^[a-z0-9-]+$/).optional(),
  /** An exported project document to import. */
  project: z.unknown().optional(),
});

/** ASCII file name: accents dropped ("Botão" -> "Botao"), everything else unsafe -> _. */
export function fileSafe(title: string): string {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9_-]+/g, "_");
}

function slugTitle(project: Project, title?: string): Project {
  return title ? { ...project, title } : project;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance & { store: ProjectStore; queue: CompileQueue } {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 2 * 1024 * 1024 });
  const store = new ProjectStore(options.dbPath ?? join(REPO_ROOT, "data", "projects.sqlite"));
  const compiler = options.compiler ?? new Compiler();
  const queue = new CompileQueue(compiler);
  const edaLock = new Mutex();

  app.addHook("onClose", async () => store.close());

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof MigrationError || error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Projeto inválido", detail: error.message });
    }
    if (error instanceof RevisionConflictError) {
      return reply.status(409).send({ error: error.message, storedRevision: error.storedRevision });
    }
    if (error instanceof QueueFullError) return reply.status(429).send({ error: error.message });
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) app.log.error(error);
    return reply.status(status).send({ error: status >= 500 ? "Erro interno" : (error as Error).message });
  });

  app.get("/api/health", async () => ({
    ok: true,
    toolchain: { available: compiler.isAvailable(), arduinoCli: toolchain.arduinoCli, cores: toolchain.cores, libraries: toolchain.libraries },
  }));

  // ---- projects -------------------------------------------------------------
  app.get("/api/projects", async () => store.list());

  app.get("/api/fixtures", async () =>
    existsSync(FIXTURES_DIR)
      ? readdirSync(FIXTURES_DIR).filter((name) => existsSync(join(FIXTURES_DIR, name, "project.json")))
      : [],
  );

  app.post("/api/projects", async (request, reply) => {
    const body = CreateBody.parse(request.body ?? {});
    let project: Project;
    if (body.fixture) {
      const file = join(FIXTURES_DIR, body.fixture, "project.json");
      if (!existsSync(file)) return reply.status(404).send({ error: `Fixture ${body.fixture} não existe` });
      const fixture = migrate(JSON.parse(readFileSync(file, "utf8")));
      await seedFixtureArtifact(body.fixture, fixture, compiler.cacheDir);
      project = slugTitle({ ...fixture, id: newId("prj") }, body.title);
    } else if (body.project !== undefined) {
      // Imported documents get a new id so they never overwrite an existing project.
      project = slugTitle({ ...migrate(body.project), id: newId("prj") }, body.title);
    } else {
      project = createProject(body.title ?? "Novo projeto");
    }
    return reply.status(201).send(store.insert(project));
  });

  app.get<{ Params: { id: string } }>("/api/projects/:id", async (request, reply) => {
    const project = store.get(request.params.id);
    return project ?? reply.status(404).send({ error: "Projeto não encontrado" });
  });

  app.put<{ Params: { id: string } }>("/api/projects/:id", async (request, reply) => {
    const project = migrate(request.body);
    if (project.id !== request.params.id) return reply.status(400).send({ error: "ID do corpo difere da URL" });
    const issues = checkReferences(project, pinIdsOf).filter((i) => i.kind !== "missing-layout");
    if (issues.length) return reply.status(400).send({ error: "Referências inválidas", issues });
    return store.save(project);
  });

  app.post<{ Params: { id: string } }>("/api/projects/:id/duplicate", async (request, reply) => {
    const project = store.get(request.params.id);
    if (!project) return reply.status(404).send({ error: "Projeto não encontrado" });
    const now = new Date().toISOString();
    const copy: Project = { ...project, id: newId("prj"), title: `${project.title} (cópia)`, createdAt: now, updatedAt: now };
    return reply.status(201).send(store.insert(copy));
  });

  app.get<{ Params: { id: string } }>("/api/projects/:id/export", async (request, reply) => {
    const project = store.get(request.params.id);
    if (!project) return reply.status(404).send({ error: "Projeto não encontrado" });
    const name = `${fileSafe(project.title)}-r${project.revision}.json`;
    return reply.header("content-disposition", `attachment; filename="${name}"`).type("application/json").send(JSON.stringify(project, null, 2));
  });

  // ---- firmware -------------------------------------------------------------
  app.post("/api/compile", async (request, reply) => {
    const firmware = FirmwareBody.parse(request.body);
    return reply.status(202).send(queue.submit(firmware));
  });

  app.get<{ Params: { id: string } }>("/api/compile/:id", async (request, reply) => {
    const job = queue.get(request.params.id);
    return job ?? reply.status(404).send({ error: "Job não encontrado" });
  });

  app.delete<{ Params: { id: string } }>("/api/compile/:id", async (request, reply) => {
    const job = queue.cancel(request.params.id);
    return job ?? reply.status(404).send({ error: "Job não encontrado" });
  });

  app.get<{ Params: { hash: string } }>("/api/artifacts/:hash", async (request, reply) => {
    const hash = request.params.hash.replace(/\.hex$/, "");
    if (!HASH.test(hash)) return reply.status(400).send({ error: "Hash inválido" });
    const file = join(compiler.cacheDir, `${hash}.hex`);
    if (!existsSync(file)) return reply.status(404).send({ error: "Artefato não encontrado; compile novamente." });
    return reply.type("text/plain").header("cache-control", "public, max-age=31536000, immutable").send(await readFile(file, "utf8"));
  });

  // ---- schematic / PCB ------------------------------------------------------
  app.post("/api/eda", async (request) => {
    const project = migrate((request.body as { project?: unknown } | undefined)?.project);
    return edaLock.run(() => projectToCircuitJson(project));
  });

  app.post("/api/fabrication", async (request, reply) => {
    const project = migrate((request.body as { project?: unknown } | undefined)?.project);
    const files = await edaLock.run(async () => {
      const eda = await projectToCircuitJson(project);
      const output = await fabricationFiles(eda.circuitJson, { title: project.title, revision: project.revision });
      const notes = [...eda.notes, ...eda.diagnostics.map((d) => `[${d.severity}] ${d.message}`)];
      output.push({
        path: "LEIA-ME.txt",
        content: [
          `Projeto: ${project.title}`,
          `Revisão: ${project.revision}`,
          `Gerado em: ${new Date().toISOString()}`,
          "",
          "Arquivos gerados automaticamente a partir da conectividade do projeto.",
          "Inspecione-os em um visualizador independente (ex.: KiCad GerbView) antes de fabricar.",
          "",
          ...notes.map((n) => `- ${n}`),
          "",
        ].join("\n"),
      });
      return output;
    });
    const zip = zipSync(Object.fromEntries(files.map((f) => [f.path, strToU8(f.content)])));
    const name = `${fileSafe(project.title)}-r${project.revision}-fabricacao.zip`;
    return reply.header("content-disposition", `attachment; filename="${name}"`).type("application/zip").send(Buffer.from(zip));
  });

  return Object.assign(app, { store, queue });
}

/** Lets a fixture run without the toolchain installed: its precompiled hex seeds the cache. */
async function seedFixtureArtifact(name: string, project: Project, cacheDir: string) {
  const hash = project.artifacts.firmware?.hash;
  const hex = join(FIXTURES_DIR, name, "firmware.hex");
  if (!hash || !HASH.test(hash) || !existsSync(hex)) return;
  const target = join(cacheDir, `${hash}.hex`);
  if (existsSync(target)) return;
  await mkdir(cacheDir, { recursive: true });
  await copyFile(hex, target);
}