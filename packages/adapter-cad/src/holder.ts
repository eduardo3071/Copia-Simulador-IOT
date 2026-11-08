import { CUT_MARGIN, EMBED, type Vec3 } from "./layout.ts";

/**
 * Light-box + C-column holder for the "pregoscopio" (a light-pipe tube with a slide clamp on top).
 * Pure layout: every dimension is computed here, without any CAD kernel (see holder-geometry.ts).
 * Millimetres, +Z up, tube axis on x = y = 0, z = 0 at the underside of the light box.
 * The box extends toward -Y (front) and the column rises behind the tube (+Y).
 */

/**
 * "pilha": 9 V battery and an on/off switch. "fonte": DC jack, LM317 dimmer board and its knob.
 * "fonte1000": the economical 1000x version: 100x/1.25 oil objective, 3 W LED on a heatsink under an iris, driver module, no knob.
 */
export type HolderVariant = "pilha" | "fonte" | "fonte1000";

export interface DriverBoard {
  width: number;
  depth: number;
  holeInset: number;
  standoffHeight: number;
  /** Centre of the board on the lid. */
  x: number;
  y: number;
}

export interface HolderParams {
  variant: HolderVariant;
  /** Outer tube diameter (caliper: 33-34 mm). */
  tubeDiameter: number;
  /** Outer tube length, from the underside of the head plate to its lower end (caliper: 115 mm). */
  tubeLength: number;
  /** Inner (telescopic) tube that carries the objective (caliper: 22-23 mm). */
  sleeveDiameter: number;
  /** How much of the inner tube shows below the outer one when fully pushed in (~9 mm in the photos). */
  sleeveLength: number;
  /** Nominal extension of the inner tube; the focus moves it between 0 and `INNER_PULL_MAX`. */
  innerPull: number;
  /** Objective body (caliper: ~20 mm). */
  objectiveDiameter: number;
  /** Objective length below the inner tube (caliper: ~35 mm). */
  objectiveLength: number;
  /** Front lens to slide-top distance at best focus: ~0.6 mm for a 40x/0.65 plus the 0.17 mm cover glass. */
  workingDistance: number;
  /** Trim of the whole tube, for a mounting height tuned after the test print. */
  focusOffset: number;
  /** Microscope slide: 76 x 26 x 1 mm. It slides in a channel in the box top, under the objective. */
  slideWidth: number;
  slideThickness: number;
  slideFit: number;
  channelDepth: number;
  /** Added to the tube diameter for the clamp bore. */
  boreClearance: number;
  /** Space left open between the two clamp halves, closed by the screws to squeeze the tube. */
  clampGap: number;
  wall: number;
  /** Radial wall of the clamp ring. */
  ringWall: number;
  ringHeight: number;
  boxWidth: number;
  boxDepthFront: number;
  boxDepthBack: number;
  boxHeight: number;
  columnWidth: number;
  columnDepth: number;
  /** Vertical corners of the box and top edge round-over (0 = sharp). */
  cornerRadius: number;
  edgeRound: number;
  /** Radius of the column/arm profile: outer corner at the top and the inner corner under the arm. */
  columnRound: number;
  /** Lightening window through the column, along Y (printable: it is a vertical hole when the body lies on its back). */
  lighten: boolean;
  windowWidth: number;
  /** Solid column left above the box and below the arm. */
  windowMargin: number;
  ledWindowDiameter: number;
  switchCutout: { x: number; width: number; height: number };
  /** Panel DC barrel jack DC-022B (5.5 x 2.1 mm plug, 7.8 mm panel hole per seller listings) on the right wall. */
  jackDiameter: number;
  jackY: number;
  /** Rheostat shaft hole on the front wall (6 mm shaft, 7.5 mm hole). */
  knobDiameter: number;
  knobX: number;
  /** Driver board (LM317, R1, C1...): M3 holes `holeInset` from the edges, standing on the lid. v1 is 40 x 25 mm in front of the LED, v2 is 70 x 25 mm where the battery would be. */
  driverBoards: Record<HolderVariant, DriverBoard>;
  /** 9 V battery (PP3 / 6F22): 48.5 x 26.5 x 17.5 mm. */
  batteryLength: number;
  batteryWidth: number;
  batteryFit: number;
  cradleWall: number;
  cradleHeight: number;
  /** Centre of the battery along Y, inside the box (behind the LED). */
  batteryY: number;
  /** 5 mm LED: body, flange and height above the flange seat. */
  ledFlange: number;
  ledHeightAboveSeat: number;
  ledFit: number;
  ledSeatDepth: number;
  ledPostDiameter: number;
  /** Air between the LED tip and the inner ceiling of the box. */
  ledToCeiling: number;
  /** Translucent disc over the window, seated from inside. */
  diffuserDiameter: number;
  diffuserThickness: number;
  diffuserFit: number;
  screwHole: number;
  /** Pilot for a self-tapping M3: 80 % of the screw hole. */
  pilotHole: number;
  /** 1000x version: printed light tube that stands on the lid around the LED, with an aperture wheel above it, under the diffuser. */
  lightTubeInnerDiameter: number;
  lightTubeWall: number;
  /** Aperture wheel: a printed disc that turns on a pin of the light tube; its edge sticks out of a slot in the right wall. */
  wheelRadius: number;
  wheelThickness: number;
  /** Distance from the pin to the optical axis; the holes lie on a circle of this radius around the pin. */
  wheelPivot: number;
  /** Air above the wheel under the ceiling. */
  wheelGap: number;
  /** Hole diameters in the order they sit around the wheel, mm. */
  wheelApertures: number[];
  /** Round aluminium heatsink under the 3 W LED star, inside the light tube. */
  heatsinkDiameter: number;
  heatsinkHeight: number;
  /** Aluminium star board of the LED. */
  ledStarDiameter: number;
  ledStarThickness: number;
}

/** The inner tube can be pulled 40 mm out of the outer one (155 mm in total, measured). */
export const INNER_PULL_MAX = 40;

export const DEFAULT_HOLDER_PARAMS: HolderParams = {
  variant: "pilha",
  tubeDiameter: 33.5,
  tubeLength: 115,
  sleeveDiameter: 22.5,
  sleeveLength: 9,
  innerPull: 28,
  objectiveDiameter: 20,
  objectiveLength: 35,
  workingDistance: 0.8,
  focusOffset: 0,
  slideWidth: 26,
  slideThickness: 1,
  slideFit: 0.6,
  channelDepth: 0.6,
  boreClearance: 0.2,
  clampGap: 0.6,
  wall: 2.4,
  ringWall: 4,
  ringHeight: 22,
  boxWidth: 90,
  boxDepthFront: 45,
  boxDepthBack: 70,
  boxHeight: 40,
  columnWidth: 44,
  columnDepth: 30,
  cornerRadius: 6,
  edgeRound: 2,
  columnRound: 8,
  lighten: true,
  windowWidth: 30,
  windowMargin: 22,
  ledWindowDiameter: 24,
  switchCutout: { x: -25, width: 21.2, height: 15 },
  jackDiameter: 7.8,
  jackY: 0,
  knobDiameter: 7.5,
  knobX: 25,
  driverBoards: {
    pilha: { width: 40, depth: 25, holeInset: 3.5, standoffHeight: 6, x: 8, y: -19 },
    fonte: { width: 70, depth: 25, holeInset: 3.5, standoffHeight: 6, x: 0, y: 38 },
    // 40 x 25 mm perforated board that carries the driver module and D2, behind the light tube
    fonte1000: { width: 40, depth: 25, holeInset: 3.5, standoffHeight: 6, x: 0, y: 42 },
  },
  batteryLength: 48.5,
  batteryWidth: 26.5,
  batteryFit: 0.6,
  cradleWall: 1.6,
  cradleHeight: 12,
  batteryY: 38,
  ledFlange: 5.8,
  ledHeightAboveSeat: 8,
  ledFit: 0.4,
  ledSeatDepth: 1.5,
  ledPostDiameter: 9,
  ledToCeiling: 2,
  diffuserDiameter: 26,
  diffuserThickness: 0.8,
  diffuserFit: 0.4,
  screwHole: 3.4,
  pilotHole: 2.6,
  lightTubeInnerDiameter: 44.4,
  lightTubeWall: 2,
  // 36 mm of radius clears the corner post of the box by 0.7 mm; the window of the LED (24 mm) is the light path the wheel has to cover
  wheelRadius: 36,
  wheelThickness: 1.8,
  wheelPivot: 22,
  wheelGap: 0.6,
  wheelApertures: [24, 10, 2, 5, 16],
  heatsinkDiameter: 30,
  heatsinkHeight: 12,
  ledStarDiameter: 20,
  ledStarThickness: 1.6,
};

export interface HolderCutout {
  id: string;
  shape: "rect" | "circle";
  axis: "x" | "y" | "z";
  center: Vec3;
  size: Vec3;
}

export interface HolderPost {
  x: number;
  y: number;
  outerDiameter: number;
  pilotDiameter: number;
  bottom: number;
  top: number;
}

export interface HolderLayout {
  params: HolderParams;
  box: { xMin: number; xMax: number; yMin: number; yMax: number; height: number };
  cavity: { xMin: number; xMax: number; yMin: number; yMax: number; top: number };
  posts: HolderPost[];
  column: { xMin: number; xMax: number; yMin: number; yMax: number; bottom: number; top: number };
  /** Rounded stadium window through the column (null when `lighten` is off). */
  columnWindow: { width: number; zMin: number; zMax: number; yMin: number; yMax: number } | null;
  /** The arm that joins the column to the clamp ring, same z range as the ring. */
  arm: { xMin: number; xMax: number; yMin: number; yMax: number; bottom: number; top: number };
  ring: { outerRadius: number; boreDiameter: number; bottom: number; top: number; gap: number };
  /** Screw axes (along Y) through the ears of the clamp. */
  ears: { x: number; z: number; length: number; width: number }[];
  /** The pregoscopio as the layout assumes it, in its nominal position: used for the fit check. */
  tube: {
    bottom: number;
    top: number;
    radius: number;
    sleeveRadius: number;
    sleeveBottom: number;
    objectiveRadius: number;
    /** Front lens of the objective. */
    noseZ: number;
  };
  /** Top of the slide when it sits in the channel; the objective focuses `workingDistance` above it. */
  samplePlane: number;
  lid: { bottom: number; top: number; holes: { x: number; y: number }[]; /** Ventilation holes around the LED heatsink (1000x version). */ vents: { x: number; y: number; diameter: number }[] };
  /** Parts that stand on the lid, inside the box. */
  cradle: { xMin: number; xMax: number; yMin: number; yMax: number; height: number } | null;
  /** Standoffs and outline of the driver board, on the lid. */
  boardPosts: { x: number; y: number; outerDiameter: number; top: number }[];
  board: { xMin: number; xMax: number; yMin: number; yMax: number; standoffHeight: number };
  ledPost: { x: number; y: number; diameter: number; top: number; seatDiameter: number; seatDepth: number; legHole: number; ledTop: number; slot: { dir: 1 | -1; height: number } };
  /** False in the 1000x version: the LED is a star on a heatsink, not a 5 mm LED on a post. */
  hasLedPost: boolean;
  /** 1000x version: printed tube that stands on the lid, holds the iris under the diffuser and shields the stray light. */
  lightTube: {
    outerDiameter: number;
    innerDiameter: number;
    bottom: number;
    top: number;
    /** Round boss on the rim that carries the wheel, and the pin up through it. */
    boss: { x: number; diameter: number; top: number };
    /** Slot at the foot of the tube, on the +y side (toward the driver board), where the wires of the LED come in. */
    slot: { halfWidth: number; height: number };
    pin: { diameter: number; top: number };
    heatsinkTop: number;
    /** Top of the LED star board and of the emitter dome over it. */
    starTop: number;
    emitterTop: number;
    /** Distance from the emitter to the underside of the wheel. */
    emitterToWheel: number;
    wheel: {
      pivotX: number;
      radius: number;
      bottom: number;
      top: number;
      thickness: number;
      pinHole: number;
      /** Hole centres and diameters in the wheel frame (pivot at the origin, wheel not yet turned). */
      holes: { angle: number; x: number; y: number; diameter: number }[];
      /** Slot in the right wall for the part of the wheel that sticks out. */
      slotWidth: number;
      slotHeight: number;
      /** How far the wheel reaches past the outer face of the right wall. */
      protrusion: number;
    };
  } | null;
  /** Seat cut into the ceiling around the window, from inside. */
  diffuserSeat: { diameter: number; bottom: number; top: number; discDiameter: number; discThickness: number };
  cutouts: HolderCutout[];
  totalHeight: number;
  issues: { severity: "error" | "warning"; message: string }[];
}

export function holderLayout(params: HolderParams = DEFAULT_HOLDER_PARAMS): HolderLayout {
  const p = params;
  const issues: HolderLayout["issues"] = [];
  const box = { xMin: -p.boxWidth / 2, xMax: p.boxWidth / 2, yMin: -p.boxDepthFront, yMax: p.boxDepthBack, height: p.boxHeight };
  const cavity = {
    xMin: box.xMin + p.wall,
    xMax: box.xMax - p.wall,
    yMin: box.yMin + p.wall,
    yMax: box.yMax - p.wall,
    top: box.height - p.wall,
  };

  const samplePlane = box.height + p.slideThickness - p.channelDepth;
  const noseZ = samplePlane + p.workingDistance + p.focusOffset;
  const tubeBottom = noseZ + p.objectiveLength + p.sleeveLength + p.innerPull;
  const tubeTop = tubeBottom + p.tubeLength;
  const ringOuter = (p.tubeDiameter + p.boreClearance) / 2 + p.ringWall;
  const ring = {
    outerRadius: ringOuter,
    boreDiameter: p.tubeDiameter + p.boreClearance,
    bottom: tubeTop - p.ringHeight,
    top: tubeTop,
    gap: p.clampGap,
  };

  const column = {
    xMin: -p.columnWidth / 2,
    xMax: p.columnWidth / 2,
    yMin: box.yMax - p.columnDepth,
    yMax: box.yMax,
    bottom: box.height - EMBED,
    top: tubeTop,
  };
  const columnWindow = p.lighten
    ? { width: p.windowWidth, zMin: box.height + p.windowMargin, zMax: tubeTop - p.ringHeight - p.windowMargin, yMin: column.yMin, yMax: column.yMax }
    : null;
  const arm = { xMin: column.xMin, xMax: column.xMax, yMin: 0, yMax: column.yMin + EMBED, bottom: ring.bottom, top: ring.top };

  const earLength = 10;
  const earWidth = 12;
  const earX = ringOuter + 3;
  const ears = [-earX, earX].map((x) => ({ x, z: (ring.bottom + ring.top) / 2, length: earLength, width: earWidth }));

  const postInset = p.wall + 5;
  const postXs = [box.xMin + postInset, box.xMax - postInset];
  const postYs = [box.yMin + postInset, box.yMax - postInset];
  const posts: HolderPost[] = postXs.flatMap((x) =>
    postYs.map((y) => ({ x, y, outerDiameter: 8, pilotDiameter: p.pilotHole, bottom: 0, top: cavity.top + EMBED })),
  );
  const econ = p.variant === "fonte1000";
  const ventRadius = (p.heatsinkDiameter + p.lightTubeInnerDiameter) / 4;
  const vents = econ
    ? Array.from({ length: 12 }, (_, k) => ({ x: Math.cos((k / 12) * Math.PI * 2) * ventRadius, y: Math.sin((k / 12) * Math.PI * 2) * ventRadius, diameter: 3.4 }))
    : [];
  const lid = { bottom: -p.wall, top: 0, holes: posts.map(({ x, y }) => ({ x, y })), vents };

  const cradleX = (p.batteryLength + p.batteryFit) / 2 + p.cradleWall;
  const cradleHalfY = (p.batteryWidth + p.batteryFit) / 2 + p.cradleWall;
  const cradle = p.variant === "pilha" ? { xMin: -cradleX, xMax: cradleX, yMin: p.batteryY - cradleHalfY, yMax: p.batteryY + cradleHalfY, height: p.cradleHeight } : null;
  const db = p.driverBoards[p.variant];
  const boardPosts = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sy) => ({
      x: db.x + (sx * (db.width - 2 * db.holeInset)) / 2,
      y: db.y + (sy * (db.depth - 2 * db.holeInset)) / 2,
      outerDiameter: 7,
      top: db.standoffHeight,
    })),
  );
  const board = { xMin: db.x - db.width / 2, xMax: db.x + db.width / 2, yMin: db.y - db.depth / 2, yMax: db.y + db.depth / 2, standoffHeight: db.standoffHeight };

  const ledTop = cavity.top - p.ledToCeiling;
  const ledPost = {
    x: 0,
    y: 0,
    diameter: p.ledPostDiameter,
    top: ledTop - p.ledHeightAboveSeat + p.ledSeatDepth,
    seatDiameter: p.ledFlange + p.ledFit,
    seatDepth: p.ledSeatDepth,
    legHole: 3.2,
    // the legs leave sideways toward the driver board (v1 in front of the LED, v2 behind it)
    slot: { dir: (p.variant === "pilha" ? -1 : 1) as 1 | -1, height: 8 },
    ledTop,
  };
  const seatDepth = p.diffuserThickness + p.diffuserFit;
  const diffuserSeat = {
    diameter: p.diffuserDiameter + p.diffuserFit,
    bottom: cavity.top - CUT_MARGIN,
    top: cavity.top + seatDepth,
    discDiameter: p.diffuserDiameter,
    discThickness: p.diffuserThickness,
  };

  const lightTube = econ
    ? (() => {
        const inner = p.lightTubeInnerDiameter;
        const starTop = p.heatsinkHeight + p.ledStarThickness;
        const emitterTop = starTop + 3.2;
        const wheelTop = cavity.top - p.wheelGap;
        const wheelBottom = wheelTop - p.wheelThickness;
        const collar = 1;
        const top = wheelBottom - collar;
        const n = p.wheelApertures.length;
        const holes = p.wheelApertures.map((diameter, k) => {
          // the hole that faces the optical axis sits at 180 degrees: the axis is at -wheelPivot from the pin
          const angle = Math.PI + (k * 2 * Math.PI) / n;
          return { angle, x: Math.cos(angle) * p.wheelPivot, y: Math.sin(angle) * p.wheelPivot, diameter };
        });
        const wallInner = cavity.xMax;
        const reachInner = Math.sqrt(Math.max(p.wheelRadius ** 2 - (wallInner - p.wheelPivot) ** 2, 0));
        return {
          outerDiameter: inner + 2 * p.lightTubeWall,
          innerDiameter: inner,
          bottom: 0,
          top,
          boss: { x: p.wheelPivot, diameter: 10, top: wheelBottom },
          slot: { halfWidth: 3.5, height: 7 },
          pin: { diameter: 3, top: wheelTop - 0.3 },
          heatsinkTop: p.heatsinkHeight,
          starTop,
          emitterTop,
          emitterToWheel: wheelBottom - emitterTop,
          wheel: {
            pivotX: p.wheelPivot,
            radius: p.wheelRadius,
            bottom: wheelBottom,
            top: wheelTop,
            thickness: p.wheelThickness,
            pinHole: 3.4,
            holes,
            slotWidth: 2 * reachInner + 2,
            slotHeight: p.wheelThickness + 0.8,
            protrusion: p.wheelPivot + p.wheelRadius - box.xMax,
          },
        };
      })()
    : null;

  const switchZ = box.height / 2;
  const cutouts: HolderCutout[] = [
    {
      id: "slide-channel",
      shape: "rect",
      axis: "x",
      center: [0, 0, box.height - p.channelDepth / 2 + CUT_MARGIN / 2],
      size: [p.boxWidth + 2 * CUT_MARGIN, p.slideWidth + p.slideFit, p.channelDepth + CUT_MARGIN],
    },
    {
      id: "window",
      shape: "circle",
      axis: "z",
      center: [0, 0, (cavity.top + box.height) / 2],
      size: [p.ledWindowDiameter, p.ledWindowDiameter, p.wall + 2 * CUT_MARGIN],
    },
    {
      id: "switch",
      shape: "rect",
      axis: "y",
      center: [p.switchCutout.x, box.yMin + p.wall / 2, switchZ],
      size: [p.switchCutout.width, p.wall + 2 * CUT_MARGIN, p.switchCutout.height],
    },
    ...(lightTube
      ? [
          {
            id: "wheel-slot",
            shape: "rect" as const,
            axis: "x" as const,
            center: [box.xMax - p.wall / 2, 0, (lightTube.wheel.bottom + lightTube.wheel.top) / 2] as Vec3,
            size: [p.wall + 2 * CUT_MARGIN, lightTube.wheel.slotWidth, lightTube.wheel.slotHeight] as Vec3,
          },
        ]
      : []),
    ...(p.variant !== "pilha"
      ? [
          {
            id: "jack",
            shape: "circle" as const,
            axis: "x" as const,
            center: [box.xMax - p.wall / 2, p.jackY, switchZ] as Vec3,
            size: [p.wall + 2 * CUT_MARGIN, p.jackDiameter, p.jackDiameter] as Vec3,
          },
          ...(p.variant === "fonte"
            ? [
                {
                  id: "knob",
                  shape: "circle" as const,
                  axis: "y" as const,
                  center: [p.knobX, box.yMin + p.wall / 2, switchZ] as Vec3,
                  size: [p.knobDiameter, p.wall + 2 * CUT_MARGIN, p.knobDiameter] as Vec3,
                },
              ]
            : []),
        ]
      : []),
  ];

  if (p.sleeveDiameter + p.boreClearance > p.tubeDiameter) {
    issues.push({ severity: "warning", message: "A luva do objetivo é maior que o tubo: o tubo não desliza de baixo para cima no anel." });
  }
  if (p.slideWidth + p.slideFit > p.boxDepthFront * 2) {
    issues.push({ severity: "error", message: "O canal da lâmina é mais largo que a caixa." });
  }
  if (p.ledWindowDiameter >= p.tubeDiameter) {
    issues.push({ severity: "warning", message: "A janela do LED é maior que o tubo: a luz vaza ao redor." });
  }
  if (Math.abs(p.switchCutout.x) + p.switchCutout.width / 2 > box.xMax - p.wall) {
    issues.push({ severity: "error", message: "O recorte do interruptor passa da parede frontal." });
  }
  if (diffuserSeat.top > box.height - p.channelDepth - 0.4) {
    issues.push({ severity: "error", message: "O encaixe do difusor deixa menos de 0,4 mm de parede sob o canal da lâmina." });
  }
  if (p.diffuserDiameter <= p.ledWindowDiameter + 1) {
    issues.push({ severity: "error", message: "O difusor precisa ser pelo menos 1 mm maior que a janela do LED." });
  }
  if (cradle && (cradle.xMax > cavity.xMax - 10 || cradle.yMax > cavity.yMax || cradle.yMin < ledPost.y + p.ledPostDiameter / 2)) {
    issues.push({ severity: "error", message: "O compartimento da pilha não cabe na caixa ou encosta no porta-LED." });
  }
  if (columnWindow && (columnWindow.zMax - columnWindow.zMin < columnWindow.width || (p.columnWidth - p.windowWidth) / 2 < 5)) {
    issues.push({ severity: "error", message: "A janela da coluna não cabe: aumente a coluna ou reduza a janela (paredes laterais de pelo menos 5 mm)." });
  }
  if (p.cornerRadius > 0 && p.cornerRadius <= p.wall) {
    issues.push({ severity: "warning", message: "Raio dos cantos menor que a parede: o interior da caixa fica com canto vivo." });
  }
  if (board.xMin < cavity.xMin + 2 || board.xMax > cavity.xMax - 2 || board.yMin < cavity.yMin + 2 || board.yMax > cavity.yMax - 2) {
    issues.push({ severity: "error", message: "A placa do driver não cabe na caixa." });
  }
  const ledGap = Math.hypot(Math.max(board.xMin - ledPost.x, 0, ledPost.x - board.xMax), Math.max(board.yMin - ledPost.y, 0, ledPost.y - board.yMax));
  if (!econ && ledGap < ledPost.diameter / 2 + 1.5) {
    issues.push({ severity: "error", message: "A placa do driver encosta no porta-LED." });
  }
  if (lightTube) {
    const r = lightTube.outerDiameter / 2;
    if (board.yMin < r + 2 || r > cavity.xMax) {
      issues.push({ severity: "error", message: "A placa do driver encosta no tubo de luz." });
    }
    if (lightTube.outerDiameter < p.ledWindowDiameter + 2) {
      issues.push({ severity: "error", message: "O tubo de luz é menor que a janela do LED." });
    }
    if (p.heatsinkDiameter > lightTube.innerDiameter - 4) {
      issues.push({ severity: "error", message: "O dissipador não cabe dentro do tubo de luz." });
    }
    if (p.ledStarDiameter > p.heatsinkDiameter) {
      issues.push({ severity: "error", message: "A estrela do LED é maior que o dissipador." });
    }
    if (lightTube.emitterToWheel < 10) {
      issues.push({ severity: "error", message: "O LED fica a menos de 10 mm da roda de aberturas: a luz não se espalha pelo difusor." });
    }
    const w = lightTube.wheel;
    const lightR = p.ledWindowDiameter / 2;
    // the wheel has to cover the whole window, and no other hole may open into the window when one hole faces the axis
    if (w.radius < p.wheelPivot + lightR + 1) {
      issues.push({ severity: "error", message: "A roda de aberturas não cobre a janela do LED em todas as posições." });
    }
    for (const a of w.holes) {
      if (p.wheelPivot + a.diameter / 2 > w.radius - 2) issues.push({ severity: "error", message: `O furo de ${a.diameter} mm fica a menos de 2 mm da borda da roda.` });
      for (const b of w.holes) {
        if (a === b) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d - b.diameter / 2 < lightR + 0.8) issues.push({ severity: "error", message: `O furo de ${b.diameter} mm invade a janela quando o de ${a.diameter} mm está no eixo.` });
        if (d - a.diameter / 2 - b.diameter / 2 < 1.2) issues.push({ severity: "error", message: `Os furos de ${a.diameter} e ${b.diameter} mm ficam a menos de 1,2 mm um do outro.` });
      }
    }
    if (p.wheelPivot - w.radius < cavity.xMin + 1 || w.radius > cavity.yMax - 0 || w.radius > -cavity.yMin) {
      issues.push({ severity: "error", message: "A roda de aberturas não cabe na caixa." });
    }
    if (w.protrusion < 8) {
      issues.push({ severity: "warning", message: "A roda sai menos de 8 mm da parede: fica difícil de girar com o dedo." });
    }
  }
  if (cradle && board.yMax > cradle.yMin - 2 && board.xMax > cradle.xMin && board.xMin < cradle.xMax) {
    issues.push({ severity: "error", message: "A placa do driver encosta no berço da pilha." });
  }
  // the rocker switch hangs about 15 mm inside the front wall
  const swHalf = p.switchCutout.width / 2 + 2;
  if (board.yMin < cavity.yMin + 15 && board.xMin < p.switchCutout.x + swHalf && board.xMax > p.switchCutout.x - swHalf) {
    issues.push({ severity: "warning", message: "A placa do driver fica na frente do corpo do interruptor." });
  }
  if (p.workingDistance + p.focusOffset < 0.2) {
    issues.push({ severity: "error", message: "A lente frontal ficaria a menos de 0,2 mm da lâmina: aumente workingDistance ou focusOffset." });
  }
  if (p.innerPull < 0 || p.innerPull > INNER_PULL_MAX) {
    issues.push({ severity: "error", message: `O tubo interno só estende de 0 a ${INNER_PULL_MAX} mm.` });
  }

  return {
    params: p,
    box,
    cavity,
    posts,
    column,
    columnWindow,
    arm,
    ring,
    ears,
    tube: {
      bottom: tubeBottom,
      top: tubeTop,
      radius: p.tubeDiameter / 2,
      sleeveRadius: p.sleeveDiameter / 2,
      sleeveBottom: tubeBottom - p.sleeveLength - p.innerPull,
      objectiveRadius: p.objectiveDiameter / 2,
      noseZ,
    },
    samplePlane,
    lid,
    cradle,
    boardPosts,
    board,
    ledPost,
    hasLedPost: !econ,
    lightTube,
    diffuserSeat,
    cutouts,
    totalHeight: tubeTop,
    issues,
  };
}
