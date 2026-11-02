import opencascade from "replicad-opencascadejs";
import wasmUrl from "replicad-opencascadejs/wasm?url";
import { startCadWorker } from "@simiot/adapter-cad/worker-host";

// The ~23 MB kernel is fetched only when the Gabinete tab first asks for geometry.
startCadWorker(self as unknown as Parameters<typeof startCadWorker>[0], () => opencascade({ locateFile: () => wasmUrl }));
