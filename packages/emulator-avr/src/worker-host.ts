import { PROTOCOL_VERSION, type FromWorker, type RunState, type ToWorker } from "./protocol.ts";
import { AvrRunner } from "./runner.ts";

interface Scope {
  postMessage(message: FromWorker): void;
  addEventListener(type: "message", listener: (event: MessageEvent<ToWorker>) => void): void;
  close(): void;
}

/** Wall-clock slice between scheduler ticks. */
const TICK_MS = 10;
/** Never simulate more than this per tick, so a slow machine degrades to slow-motion instead of freezing. */
const MAX_SLICE_MS = 40;
const PIN_REPORT_MS = 33;

/**
 * Runs inside a dedicated Web Worker. Simulated time advances with CPU cycles,
 * paced against wall-clock time (scaled by `speed`), never by animation frames.
 */
export function startEmulatorWorker(scope: Scope) {
  let runner: AvrRunner | undefined;
  let state: RunState = "idle";
  let speed = 1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastWall = 0;
  let lastReport = 0;
  let serialBuffer = "";
  let realtimeRatio = 1;
  let lastPinsKey = "";

  const post = (message: FromWorker) => scope.postMessage(message);
  const setState = (next: RunState) => {
    state = next;
    post({ v: 1, type: "state", state, timeMs: runner?.timeMs ?? 0 });
  };

  const reportPins = (force: boolean) => {
    if (!runner) return;
    const ports = runner.registers();
    const { duty, pulseUs, freqHz } = runner.takeStats();
    const key = JSON.stringify(ports) + JSON.stringify(duty) + JSON.stringify(pulseUs) + JSON.stringify(freqHz);
    if (force || key !== lastPinsKey) {
      lastPinsKey = key;
      post({ v: 1, type: "pins", ports, duty, pulseUs, freqHz, timeMs: runner.timeMs, realtimeRatio });
    }
    const states = runner.takeDeviceStates();
    if (states) post({ v: 1, type: "deviceState", states });
    if (serialBuffer) {
      post({ v: 1, type: "serial", text: serialBuffer });
      serialBuffer = "";
    }
  };

  const tick = () => {
    if (!runner || state !== "running") return;
    const now = performance.now();
    const wallMs = Math.min(now - lastWall, MAX_SLICE_MS);
    lastWall = now;
    const started = performance.now();
    try {
      runner.runMs(wallMs * speed);
    } catch (error) {
      post({ v: 1, type: "error", message: `Falha na execução: ${String(error)}` });
      setState("paused");
      return;
    }
    const cost = performance.now() - started;
    realtimeRatio = cost > 0 ? Math.min(1, (wallMs * speed) / Math.max(cost, wallMs)) : 1;
    if (now - lastReport >= PIN_REPORT_MS) {
      lastReport = now;
      reportPins(false);
    }
    timer = setTimeout(tick, TICK_MS);
  };

  const halt = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  scope.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.v !== PROTOCOL_VERSION) {
      post({ v: 1, type: "error", message: `Versão de protocolo incompatível: ${String(msg.v)}` });
      return;
    }
    switch (msg.type) {
      case "load":
        halt();
        try {
          runner = new AvrRunner(msg.hex, msg.clockHz);
          runner.onSerialByte = (byte) => (serialBuffer += String.fromCharCode(byte));
          speed = msg.speed;
          setState("loaded");
          reportPins(true);
        } catch (error) {
          runner = undefined;
          post({ v: 1, type: "error", message: String(error instanceof Error ? error.message : error) });
          setState("idle");
        }
        break;
      case "run":
        if (!runner || state === "running") break;
        lastWall = performance.now();
        setState("running");
        timer = setTimeout(tick, 0);
        break;
      case "pause":
        if (state !== "running") break;
        halt();
        reportPins(true);
        setState("paused");
        break;
      case "reset":
        if (!runner) break;
        runner.reset();
        lastPinsKey = "";
        reportPins(true);
        post({ v: 1, type: "state", state, timeMs: 0 });
        break;
      case "stop":
        halt();
        runner = undefined;
        setState("stopped");
        scope.close();
        break;
      case "setDigital":
        runner?.setDigitalInput(msg.port, msg.bit, msg.high);
        break;
      case "setAnalog":
        runner?.setAnalogInput(msg.channel, msg.volts);
        break;
      case "serialInput":
        runner?.writeSerial(msg.text);
        break;
      case "devices":
        runner?.setDevices(msg.devices);
        break;
      case "deviceEnv":
        runner?.setDeviceEnv(msg.id, msg.env);
        break;
    }
  });
}