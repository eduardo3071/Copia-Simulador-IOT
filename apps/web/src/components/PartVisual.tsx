import { createElement, useEffect, useRef } from "react";
import type { ComponentDefinition } from "@simiot/component-catalog";
import type { LabState } from "@simiot/adapter-lab";
import type { LcdState } from "@simiot/emulator-avr";
import type { ComponentInstance } from "@simiot/project-model";
import { BreadboardSvg } from "./BreadboardSvg.tsx";
import { CapacitorSvg } from "./CapacitorSvg.tsx";
import { GenericSvg } from "./GenericSvg.tsx";

/** Everything the simulation knows about one part, for drawing it. */
export interface PartSimState {
  led?: LabState["leds"][string];
  buzzer?: LabState["buzzers"][string];
  servo?: LabState["servos"][string];
  ldr?: LabState["ldrModules"][string];
  device?: unknown;
  powered?: boolean;
  /** Latching switch is closed. */
  closed?: boolean;
}

interface Props {
  component: ComponentInstance;
  def: ComponentDefinition;
  running: boolean;
  sim: PartSimState;
  /** PB5 level, drives the Uno's on-board "L" LED. */
  led13?: boolean;
  onPress?: (down: boolean) => void;
  onPot?: (position: number) => void;
  onToggle?: () => void;
}

const level = (s: { lit: boolean; brightness: number } | undefined) => (s?.lit ? Math.max(0.15, s.brightness) : 0);

export function PartVisual({ component, def, running, sim, led13, onPress, onPot, onToggle }: Props) {
  const ref = useRef<HTMLElement>(null);
  const handlers = useRef({ onPress, onPot });
  handlers.current = { onPress, onPot };
  // a servo keeps its position when the signal stops
  const lastAngle = useRef(0);
  if (sim.servo?.angle !== undefined) lastAngle.current = sim.servo.angle;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const press = () => handlers.current.onPress?.(true);
    const release = () => handlers.current.onPress?.(false);
    const input = (event: Event) => {
      const target = el as unknown as { value: number; max?: number };
      const value = Number((event as CustomEvent).detail ?? target.value);
      const max = typeof target.max === "number" && target.max > 0 ? target.max : 1023;
      handlers.current.onPot?.(Math.min(1, Math.max(0, value / max)));
    };
    el.addEventListener("button-press", press);
    el.addEventListener("button-release", release);
    el.addEventListener("input", input);
    return () => {
      el.removeEventListener("button-press", press);
      el.removeEventListener("button-release", release);
      el.removeEventListener("input", input);
    };
  }, []);

  if (def.visual.kind === "breadboard") return <BreadboardSvg />;
  if (def.visual.kind === "generic") {
    const volts = component.params.voltage;
    return <GenericSvg shape={def.visual.shape} {...(volts !== undefined ? { label: `${volts} V` } : {})} closed={!!sim.closed} {...(onToggle ? { onToggle } : {})} />;
  }
  if (def.visual.kind === "capacitor") return <CapacitorSvg label={`${component.params.capacitance ?? 100}n`} />;

  const props: Record<string, unknown> = { ref };
  const segments = running ? sim.led?.segments : undefined;
  switch (def.id) {
    case "led":
      props.color = String(component.params.color ?? "red");
      props.value = !!segments?.[0]?.lit;
      props.brightness = level(segments?.[0]);
      break;
    case "rgb-led":
      props.ledRed = level(segments?.[0]);
      props.ledGreen = level(segments?.[1]);
      props.ledBlue = level(segments?.[2]);
      break;
    case "7segment":
    case "led-bar-graph":
      props.color = String(component.params.color ?? "red");
      props.values = (def.simulation.leds ?? []).map((_, i) => (segments?.[i]?.lit ? 1 : 0));
      break;
    case "buzzer":
      props.hasSignal = running && !!sim.buzzer?.active;
      break;
    case "servo":
      props.angle = lastAngle.current;
      break;
    case "lcd1602": {
      const lcd = running && sim.powered ? (sim.device as LcdState | undefined) : undefined;
      props.characters = new Uint8Array(lcd?.characters ?? new Array(32).fill(0x20));
      props.cursor = !!lcd?.cursor;
      props.blink = !!lcd?.blink;
      props.cursorX = lcd?.cursorX ?? 0;
      props.cursorY = lcd?.cursorY ?? 0;
      props.backlight = running && !!sim.powered;
      break;
    }
    case "ldr-module":
      props.ledPower = running && !!sim.ldr?.powered;
      props.ledDO = running && !!sim.ldr?.powered && !sim.ldr.do; // the module LED lights when DO is low (bright)
      break;
    case "resistor":
      props.value = String(component.params.resistance ?? 220);
      break;
    case "pushbutton":
      props.color = String(component.params.color ?? "red");
      break;
    case "arduino-uno":
      props.led13 = running && !!led13;
      props.ledPower = running;
      break;
  }
  return createElement(def.visual.tag, props);
}