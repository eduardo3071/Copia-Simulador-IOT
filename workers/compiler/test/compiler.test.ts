import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cacheKeyOf, Compiler, parseDiagnostics, toolchain, type CompileRequest } from "../src/index.ts";

const core = `arduino:avr@${toolchain.cores["arduino:avr"]}`;
const request = (content: string): CompileRequest => ({
  fqbn: "arduino:avr:uno",
  core,
  mainFile: "sketch.ino",
  files: [{ path: "sketch.ino", content }],
  libraries: [],
});

describe("diagnostics parser", () => {
  it("parses gcc errors on Windows and POSIX paths, ignoring core files", () => {
    const out = [
      "C:\\Users\\x\\AppData\\Local\\Temp\\simiot-1\\sketch\\sketch.ino:5:3: error: 'foo' was not declared in this scope",
      "/tmp/simiot-2/sketch/sketch.ino:7:1: warning: unused variable 'x' [-Wunused-variable]",
      "/home/u/.arduino15/packages/arduino/hardware/avr/1.8.8/cores/arduino/main.cpp:1:1: error: nope",
    ].join("\n");
    expect(parseDiagnostics(out, ["sketch.ino"])).toEqual([
      { file: "sketch.ino", line: 5, column: 3, severity: "error", message: "'foo' was not declared in this scope" },
      { file: "sketch.ino", line: 7, column: 1, severity: "warning", message: "unused variable 'x' [-Wunused-variable]" },
    ]);
  });
});

describe("compiler", () => {
  const compiler = new Compiler({ cacheDir: mkdtempSync(join(tmpdir(), "simiot-cache-")) });

  it("rejects unsafe file names and unpinned cores before running anything", async () => {
    const bad = await compiler.compile({ ...request("void setup(){} void loop(){}"), files: [{ path: "../evil.ino", content: "" }] });
    expect(bad).toMatchObject({ ok: false, reason: "invalid-request" });
    const wrongCore = await compiler.compile({ ...request("void setup(){} void loop(){}"), core: "arduino:avr@0.0.1" });
    expect(wrongCore).toMatchObject({ ok: false, reason: "invalid-request" });
  });

  it("cache key depends on sources and toolchain only", () => {
    expect(cacheKeyOf(request("a"))).toBe(cacheKeyOf(request("a")));
    expect(cacheKeyOf(request("a"))).not.toBe(cacheKeyOf(request("b")));
  });

  it.runIf(compiler.isAvailable())("compiles a sketch, then serves it from cache", async () => {
    const first = await compiler.compile(request("void setup(){ pinMode(13, OUTPUT); }\nvoid loop(){ digitalWrite(13, !digitalRead(13)); delay(100); }\n"));
    expect(first).toMatchObject({ ok: true, cached: false });
    if (first.ok) expect(first.hex).toMatch(/^:/);
    const second = await compiler.compile(request("void setup(){ pinMode(13, OUTPUT); }\nvoid loop(){ digitalWrite(13, !digitalRead(13)); delay(100); }\n"));
    expect(second).toMatchObject({ ok: true, cached: true });
  }, 120_000);

  it.runIf(compiler.isAvailable())("reports compile errors with file and line", async () => {
    const result = await compiler.compile(request("void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  naoExiste();\n}\n"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("compile-error");
    expect(result.diagnostics[0]).toMatchObject({ file: "sketch.ino", line: 6, severity: "error" });
    expect(result.log).not.toMatch(/simiot-[0-9a-f-]{36}/);
  }, 120_000);
});