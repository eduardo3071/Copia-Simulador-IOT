// Reference projects (plan section 7), built with the same commands the editor uses.
import {
  breadboardContacts,
  getDefinition,
  getPin,
  pinPosition,
  requireDefinition,
  type ComponentDefinition,
} from "@simiot/component-catalog";
import {
  applyCommand,
  createProject,
  type Command,
  type Project,
} from "@simiot/project-model";

interface Builder {
  project: Project;
  add(defId: string, id: string, refDes: string, at: { x: number; y: number; rotation?: number }, params?: Record<string, string | number>): void;
  /** Places a part so that `pinId` sits exactly on breadboard hole `hole`. */
  insert(defId: string, id: string, refDes: string, pinId: string, hole: string, params?: Record<string, string | number>, rotation?: number): void;
  wire(id: string, a: string, b: string, color?: string): void;
  contact(id: string, a: string, b: string): void;
  run(command: Command): void;
}

const term = (ref: string) => {
  const i = ref.indexOf(":");
  return { componentId: ref.slice(0, i), pinId: ref.slice(i + 1) };
};

function builder(title: string, sketch: string): Builder {
  const fixedNow = new Date("2026-10-19T12:00:00Z");
  let project = createProject(title, fixedNow);
  project = { ...project, id: `prj_fixture_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` };
  const run = (command: Command) => {
    project = applyCommand(project, command, fixedNow);
  };
  const b: Builder = {
    get project() {
      return project;
    },
    add(defId, id, refDes, at, params) {
      const def = requireDefinition(defId);
      const defaults = Object.fromEntries(def.params.map((p) => [p.key, p.default]));
      run({
        type: "addComponent",
        component: { id, definitionId: def.id, definitionVersion: def.version, refDes, params: { ...defaults, ...params } },
        placement: { x: at.x, y: at.y, rotation: at.rotation ?? 0 },
      });
    },
    insert(defId, id, refDes, pinId, hole, params, rotation = 0) {
      const def = requireDefinition(defId);
      const bb = project.components.find((c) => c.definitionId === "breadboard-half")!;
      const bbDef = getDefinition("breadboard-half")!;
      const holePos = pinPosition(bbDef, project.breadboard.placements[bb.id]!, getPin(bbDef, hole)!);
      const local = pinPosition(def, { x: 0, y: 0, rotation }, getPin(def, pinId)!);
      b.add(defId, id, refDes, { x: holePos.x - local.x, y: holePos.y - local.y, rotation }, params);
      snapContacts(def, id, bb.id, bbDef);
    },
    wire(id, a, b2, color) {
      run({ type: "connect", connection: { id, kind: "wire", a: term(a), b: term(b2) }, ...(color ? { color } : {}) });
    },
    contact(id, a, b2) {
      run({ type: "connect", connection: { id, kind: "contact", a: term(a), b: term(b2) } });
    },
    run,
  };

  /** Same insertion rule as the editor. */
  function snapContacts(def: ComponentDefinition, componentId: string, bbId: string, bbDef: ComponentDefinition) {
    const contacts = breadboardContacts(def, project.breadboard.placements[componentId]!, bbDef, project.breadboard.placements[bbId]!);
    for (const { pinId, holeId } of contacts) {
      b.contact(`conn_${componentId}_${pinId.replace(/\W/g, "")}`, `${componentId}:${pinId}`, `${bbId}:${holeId}`);
    }
  }

  run({ type: "editSource", path: "sketch.ino", content: sketch });
  return b;
}

function blinkCircuit(b: Builder) {
  b.add("arduino-uno", "cmp_uno", "U1", { x: 40, y: 20 });
  b.add("breadboard-half", "cmp_bb", "BB1", { x: 360, y: 40 });
  b.insert("resistor", "cmp_r1", "R1", "1", "10c", { resistance: 220 });
  b.insert("led", "cmp_d1", "D1", "A", "16e", { color: "red" });
  b.wire("conn_w_d13", "cmp_uno:13", "cmp_bb:10a", "orange");
  b.wire("conn_w_gnd_led", "cmp_bb:15a", "cmp_bb:tn.15", "black");
  b.wire("conn_w_gnd", "cmp_uno:GND.1", "cmp_bb:tn.1", "black");
}

export function blinkProject(sketch: string): Project {
  const b = builder("Blink", sketch);
  blinkCircuit(b);
  return b.project;
}

export function buttonLedProject(sketch: string): Project {
  const b = builder("Botao LED", sketch);
  blinkCircuit(b);
  b.add("pushbutton", "cmp_sw1", "SW1", { x: 120, y: 280 }, { color: "green" });
  b.wire("conn_w_d2", "cmp_uno:2", "cmp_sw1:1.l", "blue");
  b.wire("conn_w_sw_gnd", "cmp_sw1:2.r", "cmp_uno:GND.2", "black");
  return b.project;
}

export function potAdcProject(sketch: string): Project {
  const b = builder("Potenciometro ADC", sketch);
  b.add("arduino-uno", "cmp_uno", "U1", { x: 40, y: 20 });
  b.add("potentiometer", "cmp_rv1", "RV1", { x: 160, y: 280 });
  b.wire("conn_w_pot_gnd", "cmp_rv1:GND", "cmp_uno:GND.2", "black");
  b.wire("conn_w_pot_vcc", "cmp_rv1:VCC", "cmp_uno:5V", "red");
  b.wire("conn_w_pot_sig", "cmp_rv1:SIG", "cmp_uno:A0", "yellow");
  return b.project;
}

const LIB = (name: string, version: string) => ({ name, version });

export function sensoresLcdProject(sketch: string): Project {
  const b = builder("Sensores LCD", sketch);
  b.run({ type: "setLibraries", libraries: [LIB("Adafruit Unified Sensor", "1.1.15"), LIB("DHT sensor library", "1.4.7"), LIB("LiquidCrystal", "1.0.7")] });
  b.add("arduino-uno", "cmp_uno", "U1", { x: 40, y: 20 });
  b.add("lcd1602", "cmp_lcd", "LCD1", { x: 360, y: 10 });
  b.add("dht22", "cmp_dht", "U2", { x: 400, y: 200 });
  const lcd: [string, string, string][] = [
    ["VSS", "GND.1", "black"], ["VDD", "5V", "red"], ["V0", "GND.1", "black"], ["RS", "12", "blue"], ["RW", "GND.1", "black"],
    ["E", "11", "purple"], ["D4", "5", "green"], ["D5", "4", "green"], ["D6", "3", "green"], ["D7", "2", "green"],
    ["A", "5V", "red"], ["K", "GND.1", "black"],
  ];
  for (const [pin, uno, color] of lcd) b.wire(`conn_lcd_${pin}`, `cmp_lcd:${pin}`, `cmp_uno:${uno}`, color);
  b.wire("conn_dht_vcc", "cmp_dht:VCC", "cmp_uno:5V", "red");
  b.wire("conn_dht_sda", "cmp_dht:SDA", "cmp_uno:7", "yellow");
  b.wire("conn_dht_gnd", "cmp_dht:GND", "cmp_uno:GND.2", "black");
  return b.project;
}

export function ultrassomServoProject(sketch: string): Project {
  const b = builder("Ultrassom Servo", sketch);
  b.run({ type: "setLibraries", libraries: [LIB("Servo", "1.3.0")] });
  b.add("arduino-uno", "cmp_uno", "U1", { x: 40, y: 20 });
  b.add("hc-sr04", "cmp_sonar", "U2", { x: 380, y: 10 });
  b.add("servo", "cmp_servo", "M1", { x: 420, y: 170 });
  b.add("buzzer", "cmp_bz", "BZ1", { x: 170, y: 270 });
  b.wire("conn_sonar_vcc", "cmp_sonar:VCC", "cmp_uno:5V", "red");
  b.wire("conn_sonar_trig", "cmp_sonar:TRIG", "cmp_uno:7", "blue");
  b.wire("conn_sonar_echo", "cmp_sonar:ECHO", "cmp_uno:8", "green");
  b.wire("conn_sonar_gnd", "cmp_sonar:GND", "cmp_uno:GND.1", "black");
  b.wire("conn_servo_gnd", "cmp_servo:GND", "cmp_uno:GND.2", "black");
  b.wire("conn_servo_vcc", "cmp_servo:V+", "cmp_uno:5V", "red");
  b.wire("conn_servo_pwm", "cmp_servo:PWM", "cmp_uno:9", "orange");
  b.wire("conn_bz_plus", "cmp_bz:2", "cmp_uno:10", "purple");
  b.wire("conn_bz_minus", "cmp_bz:1", "cmp_uno:GND.3", "black");
  return b.project;
}

export function luzRgbProject(sketch: string): Project {
  const b = builder("Luz RGB", sketch);
  b.add("arduino-uno", "cmp_uno", "U1", { x: 40, y: 20 });
  b.add("ldr-module", "cmp_ldr", "U2", { x: 400, y: 10 });
  b.add("rgb-led", "cmp_rgb", "D1", { x: 520, y: 150 });
  b.add("slide-potentiometer", "cmp_slide", "RV1", { x: 340, y: 300 });
  b.add("capacitor", "cmp_c1", "C1", { x: 200, y: 280 }, { capacitance: 100 });
  b.wire("conn_ldr_vcc", "cmp_ldr:VCC", "cmp_uno:5V", "red");
  b.wire("conn_ldr_gnd", "cmp_ldr:GND", "cmp_uno:GND.1", "black");
  b.wire("conn_ldr_ao", "cmp_ldr:AO", "cmp_uno:A0", "yellow");
  b.wire("conn_ldr_do", "cmp_ldr:DO", "cmp_uno:2", "blue");
  for (const [i, [color, uno]] of ([["R", "9"], ["G", "10"], ["B", "11"]] as const).entries()) {
    const r = `cmp_r${color.toLowerCase()}`;
    b.add("resistor", r, `R${i + 1}`, { x: 360, y: 160 + i * 30 }, { resistance: 220 });
    b.wire(`conn_${r}_mcu`, `cmp_uno:${uno}`, `${r}:1`, "orange");
    b.wire(`conn_${r}_led`, `${r}:2`, `cmp_rgb:${color}`, "orange");
  }
  b.wire("conn_rgb_com", "cmp_rgb:COM", "cmp_uno:GND.2", "black");
  b.wire("conn_slide_vcc", "cmp_slide:VCC", "cmp_uno:5V", "red");
  b.wire("conn_slide_gnd", "cmp_slide:GND", "cmp_uno:GND.3", "black");
  b.wire("conn_slide_sig", "cmp_slide:SIG", "cmp_uno:A1", "green");
  b.wire("conn_c1_vcc", "cmp_c1:1", "cmp_uno:5V", "red");
  b.wire("conn_c1_gnd", "cmp_c1:2", "cmp_uno:GND.3", "black");
  return b.project;
}

export function contador7segProject(sketch: string): Project {
  const b = builder("Contador 7 segmentos", sketch);
  b.run({ type: "setBoardSize", width: 100, height: 80 });
  b.add("arduino-uno", "cmp_uno", "U1", { x: 40, y: 20 });
  b.add("7segment", "cmp_seg", "DS1", { x: 640, y: 20 });
  b.add("led-bar-graph", "cmp_bar", "BAR1", { x: 640, y: 160 });
  const segPins = ["A", "B", "C", "D", "E", "F", "G"];
  segPins.forEach((seg, i) => {
    const r = `cmp_rs${i}`;
    b.add("resistor", r, `R${i + 1}`, { x: 360, y: 10 + i * 20 }, { resistance: 330 });
    b.wire(`conn_${r}_mcu`, `cmp_uno:${i + 2}`, `${r}:1`, "orange");
    b.wire(`conn_${r}_seg`, `${r}:2`, `cmp_seg:${seg}`, "orange");
  });
  b.wire("conn_seg_com", "cmp_seg:COM.1", "cmp_uno:GND.1", "black");
  const barPins = ["9", "10", "11", "12", "13", "A0", "A1", "A2", "A3", "A4"];
  barPins.forEach((uno, i) => {
    const r = `cmp_rb${i}`;
    b.add("resistor", r, `R${i + 8}`, { x: 360, y: 170 + i * 20 }, { resistance: 330 });
    b.wire(`conn_${r}_mcu`, `cmp_uno:${uno}`, `${r}:1`, "blue");
    b.wire(`conn_${r}_bar`, `${r}:2`, `cmp_bar:A${i + 1}`, "blue");
    b.wire(`conn_bar_c${i + 1}`, `cmp_bar:C${i + 1}`, "cmp_uno:GND.2", "black");
  });
  return b.project;
}
export const FIXTURES = [
  { name: "blink", build: blinkProject },
  { name: "button-led", build: buttonLedProject },
  { name: "pot-adc", build: potAdcProject },
  { name: "sensores-lcd", build: sensoresLcdProject },
  { name: "ultrassom-servo", build: ultrassomServoProject },
  { name: "luz-rgb", build: luzRgbProject },
  { name: "contador-7seg", build: contador7segProject },
] as const;