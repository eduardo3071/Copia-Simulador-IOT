import { createContext, useContext } from "react";

/** Material of one part of the scene: the selected one glows, a cut plane clips it. Provided by the scene, read by the models. */
export type Mat = (color: string, extra?: { opacity?: number; emissive?: string; metal?: number; rough?: number }) => Record<string, unknown>;

export const MatContext = createContext<Mat>((color) => ({ color }));
export const useMat = () => useContext(MatContext);
