/**
 * A finite number, or null. The backend sends NaN/±Inf as strings and fills
 * join misses with `"n/a"`; none of those may draw, least of all as 0.
 */
export function toFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/** A group value as text; anything but a string or number is empty. */
export function toText(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number'
		? String(value).trim()
		: '';
}
