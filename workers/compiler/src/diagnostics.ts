export interface Diagnostic {
  file: string;
  line: number;
  column?: number;
  severity: "error" | "warning";
  message: string;
}

const GCC_LINE = /^(.*?):(\d+):(?:(\d+):)? (fatal error|error|warning): (.*)$/;

/**
 * Extracts gcc diagnostics from arduino-cli output, keeping only those that refer
 * to the user's files (by basename) so paths of the temporary build dir never leak.
 */
export function parseDiagnostics(output: string, userFiles: readonly string[]): Diagnostic[] {
  const names = new Set(userFiles);
  const seen = new Set<string>();
  const diagnostics: Diagnostic[] = [];
  for (const raw of output.split(/\r?\n/)) {
    const match = GCC_LINE.exec(raw.trim());
    if (!match) continue;
    const [, path, line, column, kind, message] = match;
    const file = path!.split(/[\\/]/).pop()!;
    if (!names.has(file)) continue;
    const diagnostic: Diagnostic = {
      file,
      line: Number(line),
      ...(column ? { column: Number(column) } : {}),
      severity: kind === "warning" ? "warning" : "error",
      message: message!,
    };
    const key = JSON.stringify(diagnostic);
    if (seen.has(key)) continue;
    seen.add(key);
    diagnostics.push(diagnostic);
  }
  return diagnostics;
}
