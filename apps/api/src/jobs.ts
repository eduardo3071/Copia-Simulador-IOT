import { randomUUID } from "node:crypto";
import type { CompileRequest, CompileResult, Compiler } from "@simiot/compiler";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface CompileJob {
  id: string;
  status: JobStatus;
  createdAt: string;
  finishedAt?: string;
  result?: CompileResult;
}

const MAX_QUEUE = 20;
const KEEP_FINISHED = 100;

export class QueueFullError extends Error {}

/** Compile jobs run one at a time; each can be cancelled while queued or running. */
export class CompileQueue {
  private jobs = new Map<string, CompileJob & { request: CompileRequest; abort: AbortController }>();
  private pending: string[] = [];
  private running = false;

  constructor(private readonly compiler: Compiler) {}

  submit(request: CompileRequest): CompileJob {
    if (this.pending.length >= MAX_QUEUE) throw new QueueFullError("Fila de compilação cheia; tente novamente em instantes.");
    const job = { id: randomUUID(), status: "queued" as JobStatus, createdAt: new Date().toISOString(), request, abort: new AbortController() };
    this.jobs.set(job.id, job);
    this.pending.push(job.id);
    this.prune();
    void this.drain();
    return this.view(job);
  }

  get(id: string): CompileJob | undefined {
    const job = this.jobs.get(id);
    return job && this.view(job);
  }

  cancel(id: string): CompileJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    if (job.status === "queued") {
      this.pending = this.pending.filter((p) => p !== id);
      job.status = "cancelled";
      job.finishedAt = new Date().toISOString();
    } else if (job.status === "running") {
      job.abort.abort();
    }
    return this.view(job);
  }

  /** Resolves when the job leaves the queue (used by tests). */
  async wait(id: string, timeoutMs = 120_000): Promise<CompileJob | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const job = this.get(id);
      if (!job || (job.status !== "queued" && job.status !== "running")) return job;
      await new Promise((r) => setTimeout(r, 50));
    }
    return this.get(id);
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending.length) {
        const job = this.jobs.get(this.pending.shift()!);
        if (!job || job.status !== "queued") continue;
        job.status = "running";
        try {
          job.result = await this.compiler.compile(job.request, job.abort.signal);
          job.status = job.result.ok ? "succeeded" : job.result.reason === "cancelled" ? "cancelled" : "failed";
        } catch (error) {
          job.status = "failed";
          job.result = { ok: false, cacheKey: "", diagnostics: [], log: `Erro interno: ${String(error)}`, durationMs: 0, reason: "compile-error" };
        }
        job.finishedAt = new Date().toISOString();
      }
    } finally {
      this.running = false;
    }
  }

  private prune() {
    const finished = [...this.jobs.values()].filter((j) => j.finishedAt);
    for (const job of finished.slice(0, Math.max(0, finished.length - KEEP_FINISHED))) this.jobs.delete(job.id);
  }

  private view(job: CompileJob): CompileJob {
    const { id, status, createdAt, finishedAt, result } = job;
    return { id, status, createdAt, ...(finishedAt ? { finishedAt } : {}), ...(result ? { result } : {}) };
  }
}