import type { DeviceConfig } from "./devices.ts";
import type { PortName, PortRegisters } from "./runner.ts";

/** Bump on any incompatible change to the messages below. */
export const PROTOCOL_VERSION = 1;

export type ToWorker =
  | { v: 1; type: "load"; hex: string; clockHz: number; speed: number }
  | { v: 1; type: "run" }
  | { v: 1; type: "pause" }
  | { v: 1; type: "reset" }
  | { v: 1; type: "stop" }
  | { v: 1; type: "setDigital"; port: PortName; bit: number; high: boolean | null }
  | { v: 1; type: "setAnalog"; channel: number; volts: number }
  | { v: 1; type: "serialInput"; text: string }
  /** Replaces the set of emulated devices (DHT22, HC-SR04, LCD). */
  | { v: 1; type: "devices"; devices: DeviceConfig[] }
  | { v: 1; type: "deviceEnv"; id: string; env: Record<string, number> };

export type RunState = "idle" | "loaded" | "running" | "paused" | "stopped";

export type FromWorker =
  | { v: 1; type: "state"; state: RunState; timeMs: number }
  | {
      v: 1;
      type: "pins";
      ports: Record<PortName, PortRegisters>;
      duty: Record<string, number>;
      pulseUs: Record<string, number>;
      freqHz: Record<string, number>;
      timeMs: number;
      realtimeRatio: number;
    }
  | { v: 1; type: "deviceState"; states: Record<string, unknown> }
  | { v: 1; type: "serial"; text: string }
  | { v: 1; type: "error"; message: string };