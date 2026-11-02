// Downloads a pinned arduino-cli release into tools/arduino-cli (git-ignored),
// verifies its SHA-256 against the published checksums and installs the pinned
// cores with a project-local configuration (the global ~/.arduino15 is untouched).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toolchain = JSON.parse(readFileSync(join(root, "workers/compiler/toolchain.json"), "utf8"));
const version = toolchain.arduinoCli;
const toolsDir = join(root, "tools", "arduino-cli");
const binDir = join(toolsDir, "bin");
const exe = join(binDir, process.platform === "win32" ? "arduino-cli.exe" : "arduino-cli");
const configFile = join(toolsDir, "arduino-cli.yaml");
// Compiles use a config whose sketchbook is empty, so only libraries passed
// explicitly with --library (the project's declared, pinned ones) are visible.
const compileConfigFile = join(toolsDir, "arduino-cli.compile.yaml");

function assetName() {
  const arch = process.arch === "arm64" ? "ARM64" : "64bit";
  if (process.platform === "win32") return `arduino-cli_${version}_Windows_64bit.zip`;
  if (process.platform === "darwin") return `arduino-cli_${version}_macOS_${arch}.tar.gz`;
  return `arduino-cli_${version}_Linux_${arch}.tar.gz`;
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function cli(...args) {
  console.log(`> arduino-cli ${args.join(" ")}`);
  execFileSync(exe, ["--config-file", configFile, ...args], { stdio: "inherit" });
}

async function installBinary() {
  const installed = existsSync(exe) && execFileSync(exe, ["version"], { encoding: "utf8" }).includes(version);
  if (installed) {
    console.log(`arduino-cli ${version} já instalado.`);
    return;
  }
  const base = `https://github.com/arduino/arduino-cli/releases/download/v${version}`;
  const asset = assetName();
  console.log(`Baixando ${asset}...`);
  const [archive, checksums] = await Promise.all([download(`${base}/${asset}`), download(`${base}/${version}-checksums.txt`)]);
  const expected = checksums.toString("utf8").split("\n").find((l) => l.trim().endsWith(asset))?.split(/\s+/)[0];
  const actual = createHash("sha256").update(archive).digest("hex");
  if (!expected || expected !== actual) throw new Error(`Checksum não confere para ${asset} (esperado ${expected}, obtido ${actual}).`);
  console.log(`SHA-256 conferido: ${actual}`);
  rmSync(binDir, { recursive: true, force: true });
  mkdirSync(binDir, { recursive: true });
  const archivePath = join(toolsDir, asset);
  writeFileSync(archivePath, archive);
  // bsdtar (Windows 10+, macOS) and GNU tar (Linux, .tar.gz) both handle these archives.
  execFileSync("tar", ["-xf", archivePath, "-C", binDir], { stdio: "inherit" });
  rmSync(archivePath);
}

function writeConfig(file = configFile, user = "user") {
  const dir = (name) => join(toolsDir, name).replaceAll("\\", "/");
  mkdirSync(join(toolsDir, user), { recursive: true });
  writeFileSync(
    file,
    [
      "directories:",
      `  data: ${dir("data")}`,
      `  downloads: ${dir("downloads")}`,
      `  user: ${dir(user)}`,
      "metrics:",
      "  enabled: false",
      "updater:",
      "  enable_notification: false",
      "",
    ].join("\n"),
  );
}

mkdirSync(toolsDir, { recursive: true });
await installBinary();
writeConfig();
writeConfig(compileConfigFile, "empty-sketchbook");
cli("core", "update-index");
for (const [core, coreVersion] of Object.entries(toolchain.cores)) cli("core", "install", `${core}@${coreVersion}`);
cli("core", "list");
cli("lib", "update-index");
// --no-deps: every dependency is pinned explicitly in toolchain.json
for (const [lib, libVersion] of Object.entries(toolchain.libraries ?? {})) cli("lib", "install", "--no-deps", `${lib}@${libVersion}`);
cli("lib", "list");
console.log("Toolchain pronta.");