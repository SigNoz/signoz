import { isNumber } from 'lodash-es';

export function formatNumericValue(value: number | string): string {
	if (isNumber(value)) {
		return value.toString();
	}
	return (typeof value === 'string' ? parseFloat(value) : value).toFixed(3);
}

/** Coerce a value to a finite number, falling back to 0 for non-numeric input. */
export function toFiniteNumber(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}
