import type { EnclosureLayout, FromCadWorker, PartOutput, ToCadWorker } from "@simiot/adapter-cad";
import { hashOf, type Enclosure, type PcbLayout, type Project } from "@simiot/project-model";

export interface BuiltEnclosure {
  layout: EnclosureLayout;
  base: PartOutput;
  lid: PartOutput;
  durationMs: number;
}

/** Everything the displayed geometry depends on (PCB plus enclosure parameters and cutouts). */
export function enclosureGeometryKey(project: Project): string {
  const enclosure = project.enclosure;
  return hashOf({ pcb: project.pcb, params: enclosure?.params, cutouts: enclosure?.cutouts });
}

/** Owns the CAD Web Worker; OpenCascade booleans never run on the UI thread. */
export class CadClient {
  private worker?: Worker;
  private nextId = 1;
  private pending = new Map<number, { resolve(result: BuiltEnclosure): void; reject(error: Error): void }>();

  build(pcb: PcbLayout, enclosure: Enclosure): Promise<BuiltEnclosure> {
    const worker = (this.worker ??= this.spawn());
    const requestId = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      const message: ToCadWorker = { v: 1, type: "build", requestId, pcb, enclosure };
      worker.postMessage(message);
    });
  }

  private spawn(): Worker {
    const worker = new Worker(new URL("./enclosure.worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event: MessageEvent<FromCadWorker>) => {
      const msg = event.data;
      const waiter = this.pending.get(msg.requestId);
      if (!waiter) return;
      this.pending.delete(msg.requestId);
      if (msg.type === "built") waiter.resolve(msg);
      else waiter.reject(new Error(msg.message));
    });
    worker.addEventListener("error", (event) => {
      const error = new Error(event.message || "Falha no worker de CAD");
      for (const waiter of this.pending.values()) waiter.reject(error);
      this.pending.clear();
      worker.terminate();
      this.worker = undefined;
    });
    return worker;
  }
}
