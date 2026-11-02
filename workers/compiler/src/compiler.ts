import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as fsp from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDiagnostics, type Diagnostic } from "./diagnostics.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "..", "..", "..");
export const toolchain = JSON.parse(readFileSync(join(here, "..", "toolchain.json"), "utf8")) as {
  arduinoCli: string;
  cores: Record<string, string>;
  libraries: Record<string, string>;
};

/** Folder arduino-cli installs a library into (spaces become underscores). */
export const libraryFolder = (name: string) => name.replace(/[^A-Za-z0-9_.-]/g, "_");

export interface SourceFile {
  path: string;
  content: string;
}

export interface CompileRequest {
  fqbn: string;
  /** e.g. arduino:avr@1.8.8; must match the pinned toolchain. */
  core: string;
  mainFile: string;
  files: SourceFile[];
  libraries: { name: string; version: string }[];
}

export type CompileFailure = "compile-error" | "timeout" | "cancelled" | "invalid-request" | "toolchain-missing";

export type CompileResult =
  | { ok: true; cacheKey: string; hex: string; cached: boolean; log: string; durationMs: number }
  | { ok: false; cacheKey: string; diagnostics: Diagnostic[]; log: string; durationMs: number; reason: CompileFailure };

export interface CompilerOptions {
  cliPath?: string;
  configFile?: string;
  cacheDir?: string;
  timeoutMs?: number;
  maxLogBytes?: number;
  maxSourceBytes?: number;
}

const FILE_NAME = new RegExp("^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}\\.(ino|h|hpp|c|cpp)$");
const FQBN = new RegExp("^[a-z0-9_-]+:[a-z0-9_-]+:[a-z0-9_-]+$", "i");

export class CompileRequestError extends Error {}

export function validateRequest(req: CompileRequest, maxSourceBytes: number): void {
  if (!FQBN.test(req.fqbn)) throw new CompileRequestError(`FQBN inválido: ${req.fqbn}`);
  const [vendor, arch] = req.fqbn.split(":");
  const coreId = `${vendor}:${arch}`;
  const pinned = toolchain.cores[coreId];
  if (!pinned) throw new CompileRequestError(`Core ${coreId} não está disponível neste servidor.`);
  if (req.core !== `${coreId}@${pinned}`) {
    throw new CompileRequestError(`Versão de core não suportada: ${req.core} (disponível: ${coreId}@${pinned}).`);
  }
  const seen = new Set<string>();
  for (const lib of req.libraries) {
    const pinnedLib = toolchain.libraries[lib.name];
    if (!pinnedLib) throw new CompileRequestError(`Biblioteca não disponível: ${lib.name}. Disponíveis: ${Object.keys(toolchain.libraries).join(", ")}.`);
    if (lib.version !== pinnedLib) throw new CompileRequestError(`${lib.name}@${lib.version} não suportada (disponível: ${pinnedLib}).`);
    if (seen.has(lib.name)) throw new CompileRequestError(`Biblioteca duplicada: ${lib.name}`);
    seen.add(lib.name);
  }
  if (!req.mainFile.endsWith(".ino")) throw new CompileRequestError("O arquivo principal deve ser .ino.");
  const names = new Set<string>();
  let total = 0;
  for (const file of req.files) {
    if (!FILE_NAME.test(file.path)) throw new CompileRequestError(`Nome de arquivo não permitido: ${file.path}`);
    if (names.has(file.path)) throw new CompileRequestError(`Arquivo duplicado: ${file.path}`);
    names.add(file.path);
    total += Buffer.byteLength(file.content, "utf8");
  }
  if (!names.has(req.mainFile)) throw new CompileRequestError(`Arquivo principal ${req.mainFile} não encontrado.`);
  if (total > maxSourceBytes) throw new CompileRequestError(`Código-fonte excede ${maxSourceBytes} bytes.`);
}

/** Same sources + board + toolchain = same binary, so the hex can be reused. */
export function cacheKeyOf(req: CompileRequest): string {
  const files = [...req.files].sort((a, b) => (a.path < b.path ? -1 : 1));
  const payload = JSON.stringify({ cli: toolchain.arduinoCli, fqbn: req.fqbn, core: req.core, main: req.mainFile, files, libraries: req.libraries });
  return createHash("sha256").update(payload).digest("hex");
}

export class Compiler {
  readonly cliPath: string;
  readonly configFile: string;
  readonly librariesDir: string;
  readonly cacheDir: string;
  private readonly timeoutMs: number;
  private readonly maxLogBytes: number;
  private readonly maxSourceBytes: number;

  constructor(options: CompilerOptions = {}) {
    const tools = join(REPO_ROOT, "tools", "arduino-cli");
    this.cliPath = options.cliPath ?? join(tools, "bin", process.platform === "win32" ? "arduino-cli.exe" : "arduino-cli");
    this.configFile = options.configFile ?? join(tools, "arduino-cli.compile.yaml");
    this.librariesDir = join(tools, "user", "libraries");
    this.cacheDir = options.cacheDir ?? join(REPO_ROOT, "data", "compile-cache");
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxLogBytes = options.maxLogBytes ?? 256 * 1024;
    this.maxSourceBytes = options.maxSourceBytes ?? 256 * 1024;
  }

  isAvailable(): boolean {
    return existsSync(this.cliPath) && existsSync(this.configFile);
  }

  async compile(req: CompileRequest, signal?: AbortSignal): Promise<CompileResult> {
    const started = Date.now();
    const elapsed = () => Date.now() - started;
    let cacheKey = "";
    try {
      validateRequest(req, this.maxSourceBytes);
      cacheKey = cacheKeyOf(req);
    } catch (error) {
      if (!(error instanceof CompileRequestError)) throw error;
      return { ok: false, cacheKey, diagnostics: [], log: error.message, durationMs: elapsed(), reason: "invalid-request" };
    }

    const cached = join(this.cacheDir, `${cacheKey}.hex`);
    if (existsSync(cached)) {
      return { ok: true, cacheKey, hex: await fsp.readFile(cached, "utf8"), cached: true, log: "", durationMs: elapsed() };
    }
    if (!this.isAvailable()) {
      return { ok: false, cacheKey, diagnostics: [], log: "arduino-cli não instalado. Rode: npm run setup:arduino", durationMs: elapsed(), reason: "toolchain-missing" };
    }

    const jobDir = join(tmpdir(), `simiot-${randomUUID()}`);
    const sketchDir = join(jobDir, req.mainFile.replace(/\.ino$/, ""));
    const outDir = join(jobDir, "out");
    try {
      await fsp.mkdir(sketchDir, { recursive: true });
      await fsp.mkdir(outDir, { recursive: true });
      for (const file of req.files) await fsp.writeFile(join(sketchDir, file.path), file.content, "utf8");

      const libraryArgs = req.libraries.flatMap((lib) => ["--library", join(this.librariesDir, libraryFolder(lib.name))]);
      const missing = req.libraries.find((lib) => !existsSync(join(this.librariesDir, libraryFolder(lib.name))));
      if (missing) {
        return { ok: false, cacheKey, diagnostics: [], log: `Biblioteca ${missing.name} não instalada. Rode: npm run setup:arduino`, durationMs: elapsed(), reason: "toolchain-missing" };
      }
      const run = await this.run(
        [
          "--config-file", this.configFile, "--no-color",
          "compile", "--fqbn", req.fqbn, "--warnings", "default",
          "--output-dir", outDir, "--build-path", join(jobDir, "build"),
          ...libraryArgs,
          sketchDir,
        ],
        signal,
      );
      const log = scrubPaths(run.output);
      if (run.status !== "exited" || run.code !== 0) {
        const reason: CompileFailure = run.status === "exited" ? "compile-error" : run.status;
        const diagnostics = parseDiagnostics(run.output, req.files.map((f) => f.path));
        return { ok: false, cacheKey, diagnostics, log, durationMs: elapsed(), reason };
      }
      const hex = await fsp.readFile(join(outDir, `${req.mainFile}.hex`), "utf8");
      await fsp.mkdir(this.cacheDir, { recursive: true });
      await fsp.writeFile(cached, hex, "utf8");
      return { ok: true, cacheKey, hex, cached: false, log, durationMs: elapsed() };
    } finally {
      await fsp.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private run(args: string[], signal?: AbortSignal) {
    type Status = "exited" | "timeout" | "cancelled";
    return new Promise<{ status: Status; code: number | null; output: string }>((done) => {
      const child = spawn(this.cliPath, args, { shell: false, windowsHide: true, env: minimalEnv() });
      let output = "";
      let truncated = false;
      const collect = (chunk: Buffer) => {
        if (output.length >= this.maxLogBytes) {
          truncated = true;
          return;
        }
        output += chunk.toString("utf8");
      };
      child.stdout.on("data", collect);
      child.stderr.on("data", collect);
      let status: Status = "exited";
      const stop = (why: Exclude<Status, "exited">) => {
        status = why;
        killTree(child.pid);
      };
      const timer = setTimeout(() => stop("timeout"), this.timeoutMs);
      const onAbort = () => stop("cancelled");
      if (signal?.aborted) onAbort();
      signal?.addEventListener("abort", onAbort, { once: true });
      child.on("close", (code) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        done({ status, code, output: truncated ? `${output}\n[log truncado]` : output });
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        done({ status: "exited", code: -1, output: String(error) });
      });
    });
  }
}

/** Only what the toolchain needs; secrets in the server environment are not inherited. */
function minimalEnv(): NodeJS.ProcessEnv {
  const keep = ["PATH", "Path", "SystemRoot", "TEMP", "TMP", "HOME", "USERPROFILE", "LOCALAPPDATA", "APPDATA"];
  return Object.fromEntries(keep.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]));
}

function killTree(pid: number | undefined) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    return;
  }
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    /* already gone */
  }
}

/**
 * Hides server paths from user-visible logs: the temporary job dir (which may be
 * reported in long or 8.3 form on Windows) and the toolchain location table.
 */
function scrubPaths(log: string): string {
  return log
    .replace(/[^\s'"]*simiot-[0-9a-f-]{36}/g, "<sketch>")
    .replace(/\nUsed (platform|library)[\s\S]*?(?=\nError|\n*$)/g, "");
}