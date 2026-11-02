import { newId } from "./ids.ts";
import { SCHEMA_VERSION, type EnclosureParams, type MountingHole, type Project } from "./schema.ts";

export const DEFAULT_FQBN = "arduino:avr:uno";
export const DEFAULT_CORE = "arduino:avr@1.8.8";

export const BLINK_SKETCH = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
`;

/** FDM defaults: 2 mm walls, standoffs for M3 holes, room above the board for headers and plugs. */
export const DEFAULT_ENCLOSURE_PARAMS: EnclosureParams = {
  wall: 2,
  clearance: 0.5,
  standoffHeight: 5,
  headroom: 15,
  lipHeight: 2,
  fit: 0.2,
};

/** One hole per corner, `inset` mm from both edges (3.2 mm = M3 clearance). */
export function cornerMountingHoles(board: { width: number; height: number }, inset = 3.5, diameter = 3.2): MountingHole[] {
  const x = board.width / 2 - inset;
  const y = board.height / 2 - inset;
  return [
    { id: "MH1", x: -x, y: y, diameter },
    { id: "MH2", x: x, y: y, diameter },
    { id: "MH3", x: -x, y: -y, diameter },
    { id: "MH4", x: x, y: -y, diameter },
  ];
}

export function createProject(title: string, now = new Date()): Project {
  const timestamp = now.toISOString();
  return {
    id: newId("prj"),
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    components: [],
    connections: [],
    breadboard: { unit: "css-px", placements: {}, wires: {} },
    schematic: { unit: "schematic-unit", placements: {} },
    pcb: {
      unit: "mm",
      origin: "board-center",
      board: { width: 50, height: 40 },
      layers: 2,
      placements: {},
      mountingHoles: [],
    },
    firmware: {
      fqbn: DEFAULT_FQBN,
      core: DEFAULT_CORE,
      mainFile: "sketch.ino",
      files: [{ path: "sketch.ino", content: BLINK_SKETCH }],
      libraries: [],
    },
    simulation: { engine: "avr8js", engineVersion: "0.21.1", clockHz: 16_000_000, speed: 1 },
    enclosure: null,
    artifacts: {},
  };
}
