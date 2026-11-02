import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { Compiler } from "@simiot/compiler";
import { applyCommand, type Project } from "@simiot/project-model";
import { buildServer } from "../src/server.ts";

const compiler = new Compiler({ cacheDir: mkdtempSync(join(tmpdir(), "simiot-api-cache-")) });
const app = buildServer({ dbPath: ":memory:", compiler });

beforeAll(() => app.ready());
afterAll(() => app.close());

async function createFromFixture(name: string): Promise<Project> {
  const res = await app.inject({ method: "POST", url: "/api/projects", payload: { fixture: name } });
  expect(res.statusCode).toBe(201);
  return res.json();
}

describe("projects API", () => {
  it("creates, saves and reopens a project preserving everything", async () => {
    const created = await createFromFixture("blink");
    const edited = applyCommand(created, { type: "setParam", componentId: "cmp_r1", key: "resistance", value: 330 });
    const saved = await app.inject({ method: "PUT", url: `/api/projects/${created.id}`, payload: edited });
    expect(saved.statusCode).toBe(200);
    const reopened = (await app.inject({ method: "GET", url: `/api/projects/${created.id}` })).json();
    expect(reopened).toEqual(edited);
    const list = (await app.inject({ method: "GET", url: "/api/projects" })).json();
    expect(list.map((p: { id: string }) => p.id)).toContain(created.id);
  });

  it("rejects stale saves with 409 and invalid references with 400", async () => {
    const created = await createFromFixture("blink");
    const newer = applyCommand(created, { type: "setTitle", title: "Nova" });
    await app.inject({ method: "PUT", url: `/api/projects/${created.id}`, payload: newer });
    const stale = await app.inject({ method: "PUT", url: `/api/projects/${created.id}`, payload: created });
    expect(stale.statusCode).toBe(409);

    const broken = { ...newer, revision: newer.revision + 1, connections: [...newer.connections, { id: "conn_bad", kind: "wire", a: { componentId: "cmp_r1", pinId: "9" }, b: { componentId: "cmp_d1", pinId: "A" } }] };
    const bad = await app.inject({ method: "PUT", url: `/api/projects/${created.id}`, payload: broken });
    expect(bad.statusCode).toBe(400);
    const garbage = await app.inject({ method: "PUT", url: `/api/projects/${created.id}`, payload: { hello: "world" } });
    expect(garbage.statusCode).toBe(400);
  });

  it("duplicates and exports with a new id / revision in the file name", async () => {
    const created = await createFromFixture("pot-adc");
    const dup = await app.inject({ method: "POST", url: `/api/projects/${created.id}/duplicate` });
    expect(dup.statusCode).toBe(201);
    expect(dup.json().id).not.toBe(created.id);
    expect(dup.json().connections).toEqual(created.connections);
    const exported = await app.inject({ method: "GET", url: `/api/projects/${created.id}/export` });
    expect(exported.headers["content-disposition"]).toContain(`-r${created.revision}.json`);
    const imported = await app.inject({ method: "POST", url: "/api/projects", payload: { project: exported.json() } });
    expect(imported.json().components).toEqual(created.components);
  });

  it("serves the fixture firmware artifact without compiling", async () => {
    const created = await createFromFixture("blink");
    const res = await app.inject({ method: "GET", url: `/api/artifacts/${created.artifacts.firmware!.hash}.hex` });
    expect(res.statusCode).toBe(200);
    expect(res.body.startsWith(":")).toBe(true);
    expect((await app.inject({ method: "GET", url: "/api/artifacts/..%2F..%2Fsecret" })).statusCode).toBe(400);
  });
});

describe("compile API", () => {
  it.runIf(compiler.isAvailable())("runs a job to completion and reports diagnostics", async () => {
    const created = await createFromFixture("blink");
    const broken = { ...created.firmware, files: [{ path: "sketch.ino", content: "void setup(){}\nvoid loop(){ x(); }\n" }] };
    const submit = await app.inject({ method: "POST", url: "/api/compile", payload: broken });
    expect(submit.statusCode).toBe(202);
    const job = await app.queue.wait(submit.json().id);
    expect(job?.status).toBe("failed");
    expect(job?.result && !job.result.ok && job.result.diagnostics[0]?.line).toBe(2);
  }, 120_000);

  it("rejects malformed compile requests", async () => {
    const res = await app.inject({ method: "POST", url: "/api/compile", payload: { fqbn: 1 } });
    expect(res.statusCode).toBe(400);
  });
});

describe("EDA API", () => {
  it("returns circuit JSON tagged with the revision and a fabrication zip", async () => {
    const created = await createFromFixture("blink");
    const eda = await app.inject({ method: "POST", url: "/api/eda", payload: { project: created } });
    expect(eda.statusCode).toBe(200);
    expect(eda.json().sourceRevision).toBe(created.revision);
    expect(eda.json().circuitJson.length).toBeGreaterThan(10);

    const fab = await app.inject({ method: "POST", url: "/api/fabrication", payload: { project: created } });
    expect(fab.statusCode).toBe(200);
    const files = unzipSync(new Uint8Array(fab.rawPayload));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(["bom.csv", "LEIA-ME.txt"]));
    expect(strFromU8(files["LEIA-ME.txt"]!)).toContain(`Revisão: ${created.revision}`);
  }, 120_000);
});