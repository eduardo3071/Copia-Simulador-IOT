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
