/**
 * `0x70 / 255` reproduces the alpha the fill modes hardcoded before opacity was
 * configurable, so a series that declares none renders byte-identically.
 */
export const DEFAULT_FILL_OPACITY = 0x70 / 255;

/** Alpha ratio between a gradient's two stops, so it keeps its falloff at any opacity. */
export const GRADIENT_MID_STOP_RATIO = 0x40 / 0x70;

/** Gradient stop offsets, top to bottom of the plot area. */
export const GRADIENT_START_STOP = 0;
export const GRADIENT_MID_STOP = 0.6;
export const GRADIENT_END_STOP = 1;

/** Clamps into 0–1; missing or non-finite falls back to the default. */
export function resolveFillOpacity(opacity?: number | null): number {
	if (typeof opacity !== 'number' || !Number.isFinite(opacity)) {
		return DEFAULT_FILL_OPACITY;
	}
	return Math.min(1, Math.max(0, opacity));
}

/** 0–1 opacity → the two-digit hex alpha suffix appended to an `#rrggbb` colour. */
export function toAlphaHex(opacity: number): string {
	const alpha = Math.round(resolveFillOpacity(opacity) * 255);
	return alpha.toString(16).padStart(2, '0');
}
