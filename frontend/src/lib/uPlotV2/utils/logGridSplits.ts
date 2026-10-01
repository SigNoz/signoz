import type uPlot from 'uplot';

const DECADE_TOLERANCE = 1e-9;

function isDecade(value: number): boolean {
	if (value === 0) {
		return true;
	}
	const exponent = Math.log10(Math.abs(value));
	return Math.abs(exponent - Math.round(exponent)) < DECADE_TOLERANCE;
}

/**
 * A log axis splits at every 1–9 × 10ⁿ; a line on each buries the data under
 * a mesh. Keeps the powers of ten (and 0, which a symmetric log can include).
 */
export const keepDecadeSplits: uPlot.Axis.Filter = (_u, splits) =>
	splits.map((split) => (split != null && isDecade(split) ? split : null));
