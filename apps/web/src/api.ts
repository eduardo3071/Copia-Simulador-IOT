import type { FirmwareProject, Project } from "@simiot/project-model";

export interface Diagnostic {
  file: string;
  line: number;
  column?: number;
  severity: "error" | "warning";
  message: string;
}

export type CompileResult =
  | { ok: true; cacheKey: string; hex: string; cached: boolean; log: string; durationMs: number }
  | { ok: false; cacheKey: string; diagnostics: Diagnostic[]; log: string; durationMs: number; reason: string };

export interface CompileJob {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  result?: CompileResult;
}

export interface EdaPart {
  componentId: string;
  name: string;
  ports: Record<string, string>;
}

export interface EdaResult {
  circuitJson: Array<Record<string, any>>;
  schematicSvg: string;
  sourceRevision: number;
  inputsKey: string;
  parts: EdaPart[];
  nets: Record<string, string[]>;
  notes: string[];
  diagnostics: { type: string; message: string; severity: "error" | "warning" }[];
  autoPlaced: boolean;
}

export interface ProjectSummary {
  id: string;
  title: string;
  revision: number;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: unknown) {
    super(message);
  }
}

/** Lets the browser through ngrok's free-plan warning page when the API is exposed with an ngrok tunnel; other hosts ignore it. */
export const API_HEADERS = { "ngrok-skip-browser-warning": "1" };

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? API_HEADERS : { ...API_HEADERS, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new ApiError(data?.error ?? `HTTP ${response.status}`, response.status, data);
  return data as T;
}

export const api = {
  health: () =>
    request<{ ok: boolean; toolchain: { available: boolean; arduinoCli: string; cores: Record<string, string>; libraries: Record<string, string> } }>("GET", "/api/health"),
  listProjects: () => request<ProjectSummary[]>("GET", "/api/projects"),
  listFixtures: () => request<string[]>("GET", "/api/fixtures"),
  createProject: (body: { title?: string; fixture?: string; project?: unknown }) => request<Project>("POST", "/api/projects", body),
  getProject: (id: string) => request<Project>("GET", `/api/projects/${encodeURIComponent(id)}`),
  saveProject: (project: Project) => request<Project>("PUT", `/api/projects/${encodeURIComponent(project.id)}`, project),
  duplicateProject: (id: string) => request<Project>("POST", `/api/projects/${encodeURIComponent(id)}/duplicate`),
  exportUrl: (id: string) => `/api/projects/${encodeURIComponent(id)}/export`,
  compile: (firmware: FirmwareProject) => request<CompileJob>("POST", "/api/compile", firmware),
  compileStatus: (id: string) => request<CompileJob>("GET", `/api/compile/${id}`),
  cancelCompile: (id: string) => request<CompileJob>("DELETE", `/api/compile/${id}`),
  artifact: async (hash: string) => {
    const response = await fetch(`/api/artifacts/${hash}.hex`, { headers: API_HEADERS });
    if (!response.ok) throw new ApiError("Artefato não encontrado", response.status, undefined);
    return response.text();
  },
  eda: (project: Project) => request<EdaResult>("POST", "/api/eda", { project }),
  fabrication: async (project: Project) => {
    const response = await fetch("/api/fabrication", {
      method: "POST",
      headers: { ...API_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ project }),
    });
    if (!response.ok) throw new ApiError(`Falha ao gerar arquivos (HTTP ${response.status})`, response.status, undefined);
    const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "fabricacao.zip";
    return { blob: await response.blob(), name };
  },
};

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}