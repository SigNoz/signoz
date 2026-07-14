/**
 * Applies half-up rounding to ensure a whole number.
 * Example: 1.5 → 2, 1.49 → 1
 */
export const roundHalfUp = (value: number): number => Math.floor(value + 0.5);

/**
 * Rounds a number down to the nearest multiple of incr.
 * Used for linear scale min so the axis starts on a clean tick.
 */
export function incrRoundDn(num: number, incr: number): number {
	return Math.floor(num / incr) * incr;
}

/**
 * Rounds a number up to the nearest multiple of incr.
 * Used for linear scale max so the axis ends on a clean tick.
 */
export function incrRoundUp(num: number, incr: number): number {
	return Math.ceil(num / incr) * incr;
}

/**
 * Rounds a number to the nearest multiple of 10^dec.
 * Used for decimal precision.
 */
export function roundDecimals(val: number, dec = 0): number {
	if (Number.isInteger(val)) {
		return val;
	}

	const p = 10 ** dec;
	const n = val * p * (1 + Number.EPSILON);
	return Math.round(n) / p;
}
