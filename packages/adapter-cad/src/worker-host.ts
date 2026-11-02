import { setOC } from "replicad";
import { buildEnclosure, meshOf, stlOf } from "./geometry.ts";
import { enclosureLayout } from "./layout.ts";
import { CAD_PROTOCOL_VERSION, type FromCadWorker, type ToCadWorker } from "./protocol.ts";

interface Scope {
  postMessage(message: FromCadWorker, transfer: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent<ToCadWorker>) => void): void;
}

/**
 * Runs inside a dedicated Web Worker: OpenCascade (WASM) booleans take from tens of
 * milliseconds to seconds and must never block the UI thread. Requests are handled
 * one at a time, in order; the client drops answers it no longer needs.
 * `loadOpenCascade` is injected because locating the .wasm is bundler-specific.
 */
export function startCadWorker(scope: Scope, loadOpenCascade: () => Promise<unknown>) {
  let kernel: Promise<void> | undefined;
  let queue = Promise.resolve();

  const handle = async (msg: ToCadWorker) => {
    try {
      kernel ??= loadOpenCascade().then(
        (oc) => setOC(oc as Parameters<typeof setOC>[0]),
        (error: unknown) => {
          kernel = undefined; // let the next request retry the download
          throw error;
        },
      );
      await kernel;
      const started = performance.now();
      const layout = enclosureLayout(msg.pcb, msg.enclosure);
      const shapes = buildEnclosure(layout);
      const base = { mesh: meshOf(shapes.base), stl: await stlOf(shapes.base) };
      const lid = { mesh: meshOf(shapes.lid), stl: await stlOf(shapes.lidPrint) };
      const transfer = [base, lid].flatMap((part) => [part.stl, part.mesh.positions.buffer, part.mesh.normals.buffer, part.mesh.indices.buffer]);
      scope.postMessage(
        { v: 1, type: "built", requestId: msg.requestId, layout, base, lid, durationMs: Math.round(performance.now() - started) },
        transfer as Transferable[],
      );
    } catch (error) {

      scope.postMessage({ v: 1, type: "error", requestId: msg.requestId, message: `Falha ao gerar o gabinete: ${error instanceof Error ? error.message : String(error)}` }, []);
    }
  };

  scope.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.v !== CAD_PROTOCOL_VERSION) {
      scope.postMessage({ v: 1, type: "error", requestId: msg.requestId, message: `Versão de protocolo incompatível: ${String(msg.v)}` }, []);
      return;
    }
    if (msg.type === "build") queue = queue.then(() => handle(msg));
  });
}
