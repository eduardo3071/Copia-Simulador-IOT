import { CUT_MARGIN, EMBED, type Vec3 } from "./layout.ts";

/**
 * Light-box + C-column holder for the "pregoscopio" (a light-pipe tube with a slide clamp on top).
 * Pure layout: every dimension is computed here, without any CAD kernel (see holder-geometry.ts).
 * Millimetres, +Z up, tube axis on x = y = 0, z = 0 at the underside of the light box.
 * The box extends toward -Y (front) and the column rises behind the tube (+Y).
 */

/** "pilha": 9 V battery and an on/off switch. "fonte": DC jack, LM317 dimmer board and its knob. */
export type HolderVariant = "pilha" | "fonte";

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
  /** Dimmer board (v2): 60 x 25 mm, M3 holes 3.5 mm from the edges. */
  dimmerBoard: { width: number; depth: number; holeInset: number; standoffHeight: number };
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
}

/** The inner tube can be pulled 40 mm out of the outer one (155 mm in total, measured). */
export const INNER_PULL_MAX = 40;

export const DEFAULT_HOLDER_PARAMS: HolderParams = {
  variant: "pilha",
  tubeDiameter: 33.5,
  tubeLength: 115,
  sleeveDiameter: 22.5,
  sleeveLength: 9,
  innerPull: 10,
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
  dimmerBoard: { width: 60, depth: 25, holeInset: 3.5, standoffHeight: 6 },
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
  lid: { bottom: number; top: number; holes: { x: number; y: number }[] };
  /** Parts that stand on the lid, inside the box. */
  cradle: { xMin: number; xMax: number; yMin: number; yMax: number; height: number } | null;
  /** v2: standoffs for the dimmer board, on the lid. */
  boardPosts: { x: number; y: number; outerDiameter: number; top: number }[];
  ledPost: { x: number; y: number; diameter: number; top: number; seatDiameter: number; seatDepth: number; legHole: number; ledTop: number };
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
  const lid = { bottom: -p.wall, top: 0, holes: posts.map(({ x, y }) => ({ x, y })) };

  const cradleX = (p.batteryLength + p.batteryFit) / 2 + p.cradleWall;
  const cradleHalfY = (p.batteryWidth + p.batteryFit) / 2 + p.cradleWall;
  const cradle = p.variant === "pilha" ? { xMin: -cradleX, xMax: cradleX, yMin: p.batteryY - cradleHalfY, yMax: p.batteryY + cradleHalfY, height: p.cradleHeight } : null;
  const db = p.dimmerBoard;
  const boardPosts =
    p.variant === "fonte"
      ? [-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) => ({
            x: (sx * (db.width - 2 * db.holeInset)) / 2,
            y: p.batteryY + (sy * (db.depth - 2 * db.holeInset)) / 2,
            outerDiameter: 7,
            top: db.standoffHeight,
          })),
        )
      : [];

  const ledTop = cavity.top - p.ledToCeiling;
  const ledPost = {
    x: 0,
    y: 0,
    diameter: p.ledPostDiameter,
    top: ledTop - p.ledHeightAboveSeat + p.ledSeatDepth,
    seatDiameter: p.ledFlange + p.ledFit,
    seatDepth: p.ledSeatDepth,
    legHole: 3.2,
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
    ...(p.variant === "fonte"
      ? [
          {
            id: "jack",
            shape: "circle" as const,
            axis: "x" as const,
            center: [box.xMax - p.wall / 2, p.jackY, switchZ] as Vec3,
            size: [p.wall + 2 * CUT_MARGIN, p.jackDiameter, p.jackDiameter] as Vec3,
          },
          {
            id: "knob",
            shape: "circle" as const,
            axis: "y" as const,
            center: [p.knobX, box.yMin + p.wall / 2, switchZ] as Vec3,
            size: [p.knobDiameter, p.wall + 2 * CUT_MARGIN, p.knobDiameter] as Vec3,
          },
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
    ledPost,
    diffuserSeat,
    cutouts,
    totalHeight: tubeTop,
    issues,
  };
}
