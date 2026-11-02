import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { breadboardHalf, catalog, pinPosition, PITCH, resistor } from "../src/index.ts";

const require = createRequire(import.meta.url);
const wokwiDir = join(dirname(require.resolve("@wokwi/elements/package.json")), "dist", "esm");

/** Pin names declared in a wokwi element's source (`name: 'X'` inside pinInfo). */
function wokwiPinNames(tag: string): string[] {
  const file = `${tag.replace(/^wokwi-/, "")}-element.js`;
  const source = readFileSync(join(wokwiDir, file), "utf8");
  const pinInfo = source.slice(source.indexOf("pinInfo"));
  return [...pinInfo.matchAll(/\bname: '([^']+)'/g)].map((m) => m[1]!);
}

const MULTI_LAYOUT = new Set(["wokwi-7segment", "wokwi-lcd1602"]);

describe("component catalog", () => {
  it.each(catalog.map((d) => [d.id, d] as const))("%s has unique pin ids", (_id, def) => {
    expect(new Set(def.pins.map((p) => p.id)).size).toBe(def.pins.length);
  });

  it.each(catalog.filter((d) => d.visual.kind === "wokwi").map((d) => [d.id, d] as const))(
    "%s pins match the wokwi element pins",
    (_id, def) => {
      if (def.visual.kind !== "wokwi") return;
      const source = new Set(wokwiPinNames(def.visual.tag));
      // no invented pins
      for (const pin of def.pins) expect(source.has(pin.id), pin.id).toBe(true);
      // elements with a single pin layout must be fully covered; 7segment and lcd1602 declare
      // several layouts (digits / i2c) and we use one of them
      if (!MULTI_LAYOUT.has(def.visual.tag)) expect(def.pins.length).toBe(source.size);
    },
  );

  it.each(catalog.filter((d) => d.capabilities.fabricable && d.eda.kind !== "connector").map((d) => [d.id, d] as const))(
    "%s maps every pin to a distinct PCB pad",
    (_id, def) => {
      const ports = def.pins.map((p) => p.edaPort);
      expect(ports.every(Boolean)).toBe(true);
      expect(new Set(ports).size).toBe(ports.length);
      expect(def.eda.footprints.length).toBeGreaterThan(0);
    },
  );

  it("internal nets only reference existing pins", () => {
    for (const def of catalog) {
      const ids = new Set(def.pins.map((p) => p.id));
      for (const group of def.internalNets) for (const pin of group) expect(ids.has(pin), `${def.id}:${pin}`).toBe(true);
    }
  });

  it("breadboard has 300 main holes and 4 rails of 25", () => {
    expect(breadboardHalf.pins).toHaveLength(400);
    expect(breadboardHalf.internalNets.filter((n) => n.length === 25)).toHaveLength(4);
    expect(breadboardHalf.internalNets.filter((n) => n.length === 5)).toHaveLength(60);
  });

  it("rotates pin positions about the part centre", () => {
    const pin = resistor.pins[0]!;
    const p0 = pinPosition(resistor, { x: 0, y: 0, rotation: 0 }, pin);
    const p180 = pinPosition(resistor, { x: 0, y: 0, rotation: 180 }, pin);
    expect(p0.x).toBeCloseTo(0);
    expect(p180.x).toBeCloseTo(resistor.size.width);
    const p90 = pinPosition(resistor, { x: 0, y: 0, rotation: 90 }, pin);
    expect(p90.x).toBeCloseTo(resistor.size.width / 2 - (5.65 - resistor.size.height / 2));
    expect(PITCH).toBe(9.6);
  });
});