/**
 * Optics of the pregoscopio: the objective (40x/0.65, 160/0.17) and the eyepiece (WF10X) were designed for a 160 mm
 * "mechanical tube length", the distance from the objective's shoulder (the face its RMS thread stops against) to the
 * eyepiece's shoulder (the rim of the tube it rests on). This file keeps those numbers and the length the real tubes give.
 *
 * Sources: Nikon glossary and ISO 9345-1 / DIN 58887 (160 mm tube, intermediate image 10 mm under the eyepiece shoulder),
 * the seller drawings of the two lenses the project bought, and openflexure.org notes on 160/0.17 and RMS 0.8"-36.
 */

export const STANDARD_TUBE_LENGTH = 160;
/** The intermediate image sits this far under the eyepiece shoulder (DIN 58887; an older Leitz rule used 13 mm). */
export const IMAGE_BELOW_SEAT = 10;

/** Measured by the project from the seller drawing. */
export const OBJECTIVE_SPEC = {
  magnification: 40,
  na: 0.65,
  tubeLength: 160,
  coverGlass: 0.17,
  thread: "RMS 0,8 pol × 36 fios/pol",
  diameter: 20,
  totalLength: 38,
  /** Part under the shoulder; the rest is the thread above it. */
  belowShoulder: 35,
  /** Working distance of 40x/0.65 objectives found: 0.38 to 0.8 mm; most are 0.4 to 0.6 mm. */
  workingDistanceMin: 0.4,
  workingDistanceMax: 0.8,
} as const;

/** Measured by the project from the seller drawing of the WF10X eyepiece. */
export const EYEPIECE_SPEC = {
  magnification: 10,
  barrelDiameter: 23.2,
  barrelLength: 21,
  capDiameter: 27.5,
  totalLength: 28,
  lensDiameter: 15,
  /** Typical field number of a WF10X: 18 mm (Bresser, Kern); the engraving of the real one says. */
  fieldNumber: 18,
} as const;

/** From the STEP and the measured tubes: the lower end of the sleeve is 156.5 mm under the top of the outer tube at retract 0. */
export const TUBE_GEOMETRY = {
  outerDiameter: 33.5,
  outerLength: 115,
  innerDiameter: 22.5,
  /** How far the inner tube pulls out of the outer one. */
  innerTravel: 40,
  /** Distance from the top of the outer tube to the lower end of the inner tube when it is out by `outerLength + 0`. */
  sleeveDepthAtRetract0: 156.5,
  /** Out of the outer tube at retract 0 (the STEP value). */
  reachAtRetract0: 41.5,
} as const;

/** Mechanical tube length for an inner tube pulled `extension` mm out of the outer one (0 = flush with the bottom). */
export function tubeLengthAt(extension: number): number {
  return TUBE_GEOMETRY.outerLength + extension;
}

/** Extension that gives exactly 160 mm. */
export const EXTENSION_FOR_STANDARD = STANDARD_TUBE_LENGTH - TUBE_GEOMETRY.outerLength;

export type TubeVerdict = "ideal" | "aceitavel" | "curto" | "longo";

/** Rule of thumb of this project, not a standard: within 5 mm is ideal, within 15 mm still gives a usable but softer image. */
export function tubeVerdict(length: number): TubeVerdict {
  const d = length - STANDARD_TUBE_LENGTH;
  if (Math.abs(d) <= 5) return "ideal";
  if (Math.abs(d) <= 15) return "aceitavel";
  return d < 0 ? "curto" : "longo";
}

export interface OpticsReport {
  tubeLength: number;
  /** How far from the 160 mm the tube is (negative = short). */
  deviation: number;
  verdict: TubeVerdict;
  /** Approximate total magnification: both lenses are scaled by the ratio of the tube lengths (thin-lens estimate). */
  totalMagnification: number;
  nominalTotalMagnification: number;
  /** Where the intermediate image falls, measured down from the top of the outer tube (the eyepiece shoulder). */
  imageBelowSeat: number;
  /** Largest wall that still lets the eyepiece barrel into the outer tube with 0.2 mm of play. */
  maxOuterWall: number;
  eyepieceFitsOuter: boolean;
  eyepieceFitsInner: boolean;
}

export function opticsAt(extension: number): OpticsReport {
  const length = tubeLengthAt(extension);
  const nominal = OBJECTIVE_SPEC.magnification * EYEPIECE_SPEC.magnification;
  return {
    tubeLength: length,
    deviation: length - STANDARD_TUBE_LENGTH,
    verdict: tubeVerdict(length),
    totalMagnification: nominal * (length / STANDARD_TUBE_LENGTH),
    nominalTotalMagnification: nominal,
    imageBelowSeat: IMAGE_BELOW_SEAT,
    maxOuterWall: (TUBE_GEOMETRY.outerDiameter - (EYEPIECE_SPEC.barrelDiameter + 0.2)) / 2,
    eyepieceFitsOuter: true,
    eyepieceFitsInner: TUBE_GEOMETRY.innerDiameter >= EYEPIECE_SPEC.barrelDiameter + 0.2,
  };
}

/** Extension of the inner tube at the working position (lens 0.8 mm over the slide) with the current holder: 37 mm (sleeve 9 + pull 28). */
export const NOMINAL_EXTENSION = 37;

// ---------------------------------------------------------------------------------------------------------------
// 1000x: 100x/1.25 oil objective + the 10x eyepiece
// ---------------------------------------------------------------------------------------------------------------

export type ObjectiveId = "40x" | "100x";

export interface ObjectiveModel {
  id: ObjectiveId;
  magnification: number;
  na: number;
  immersion: "ar" | "óleo";
  /** Working distances found for objectives of this kind (mm). */
  workingDistance: { min: number; max: number; typical: number };
  /** Flange-to-nose length used for the design (mm); measured on the 40x, taken from the family on the 100x. */
  belowShoulder: number;
  spring: boolean;
}

/**
 * 100x/1.25 oil objectives found: working distance 0.06 mm (Motic EA), 0.13 (Optika), 0.14 (Motic ASC), 0.165 (Motic SP),
 * 0.18 (Optika/Micro-Pro) and 0.22 (Zeiss A-Plan, M27 thread); Bresser and Optika list 160 mm tube, 0.17 mm cover glass and 45 mm parfocal.
 * The 40x bought here measures 35 mm under the shoulder: that is NOT the 45 mm parfocal of the standard family, so a 100x of the same
 * brand may or may not match it. Measure the 100x before building (see docs/projeto-1000x.md).
 */
export const OBJECTIVES: Record<ObjectiveId, ObjectiveModel> = {
  "40x": { id: "40x", magnification: 40, na: 0.65, immersion: "ar", workingDistance: { min: 0.4, max: 0.8, typical: 0.6 }, belowShoulder: 35, spring: true },
  "100x": { id: "100x", magnification: 100, na: 1.25, immersion: "óleo", workingDistance: { min: 0.06, max: 0.22, typical: 0.16 }, belowShoulder: 45, spring: true },
};

/** Green light, the usual reference for resolution. */
export const WAVELENGTH_UM = 0.55;

/** Smallest distance resolved (Rayleigh with a condenser): 1.22 λ / (NA objective + NA condenser). Oil objectives need oil on the condenser to use NA above 1. */
export function resolutionUm(naObjective: number, naCondenser: number): number {
  return (1.22 * WAVELENGTH_UM) / (naObjective + naCondenser);
}

/** Useful magnification of an objective: 500 to 1000 times its NA (common rule; above that the image is only larger, not sharper). */
export function usefulMagnification(na: number): { min: number; max: number } {
  return { min: 500 * na, max: 1000 * na };
}

export type Illumination = "difusor" | "condensador seco" | "condensador com óleo";

/** Numerical aperture the illumination can give the specimen. A diffuser disc without condenser is estimated from its geometry. */
export function condenserNA(kind: Illumination, diffuserRadius = 13, distanceToSlide = 6): number {
  if (kind === "condensador com óleo") return 1.25;
  if (kind === "condensador seco") return 0.9;
  return Math.sin(Math.atan(diffuserRadius / distanceToSlide));
}

export interface ObjectiveReport {
  objective: ObjectiveModel;
  illumination: Illumination;
  naCondenser: number;
  /** NA the pair really uses (a dry condenser or a diffuser cannot exceed 1). */
  effectiveNA: number;
  totalMagnification: number;
  resolutionUm: number;
  /** Resolution when the condenser matches the objective: the best this objective can do. */
  bestResolutionUm: number;
  useful: { min: number; max: number };
  magnificationIsUseful: boolean;
  /** Field of view on the specimen (mm) with the eyepiece field number. */
  fieldDiameterMm: number;
  /** Apparent size of a 7 µm red cell and of a 1.4 µm parasite ring as seen in the image plane (mm). */
  redCellMm: number;
  ringMm: number;
  needsOil: boolean;
}

export function objectiveReport(id: ObjectiveId, illumination: Illumination, extension = NOMINAL_EXTENSION): ObjectiveReport {
  const o = OBJECTIVES[id];
  const nominal = o.magnification * EYEPIECE_SPEC.magnification;
  const total = nominal * (tubeLengthAt(extension) / STANDARD_TUBE_LENGTH);
  const naC = condenserNA(illumination);
  const effective = Math.min(o.na, naC);
  const useful = usefulMagnification(o.na);
  return {
    objective: o,
    illumination,
    naCondenser: naC,
    effectiveNA: effective,
    totalMagnification: total,
    resolutionUm: resolutionUm(o.na, naC),
    bestResolutionUm: resolutionUm(o.na, o.na),
    useful,
    magnificationIsUseful: nominal >= useful.min && nominal <= useful.max,
    fieldDiameterMm: EYEPIECE_SPEC.fieldNumber / o.magnification,
    redCellMm: (7 * total) / 1000,
    ringMm: (1.4 * total) / 1000,
    needsOil: o.immersion === "óleo",
  };
}

/**
 * Head height for an objective: the tube top must sit `tubeLength` over the objective shoulder, which sits `belowShoulder + workingDistance`
 * over the specimen. Returns how far the tube top is over the specimen plane (mm) for a wanted tube length.
 */
export function tubeTopOverSpecimen(id: ObjectiveId, tubeLength: number, workingDistance = OBJECTIVES[id].workingDistance.typical): number {
  return tubeLength + OBJECTIVES[id].belowShoulder + workingDistance;
}

/**
 * Brightness of a diffuser disc lit by a LED of `flux` lumens, if all of it comes out evenly and Lambertian: L = flux / (π · area), in cd/m2 (nit).
 * With a diffuser and no condenser the brightness of the image in brightfield is about this luminance times the transmission of the optics,
 * whatever the magnification, so the LED flux and the disc size decide how bright the image is.
 */
export function diffuserLuminance(fluxLumens: number, diameterMm: number): number {
  const area = Math.PI * (diameterMm / 2000) ** 2;
  return fluxLumens / (Math.PI * area);
}

/** 5 mm diffused white LED of 1200 mcd and 60 degrees: 1.2 cd × 2π(1 − cos 30°) sr. */
export const FLUX_5MM_DIFFUSED_LM = 1.2 * 2 * Math.PI * (1 - Math.cos((30 * Math.PI) / 180));
