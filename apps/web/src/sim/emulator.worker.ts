import { startEmulatorWorker } from "@simiot/emulator-avr/worker-host";

startEmulatorWorker(self as unknown as Parameters<typeof startEmulatorWorker>[0]);