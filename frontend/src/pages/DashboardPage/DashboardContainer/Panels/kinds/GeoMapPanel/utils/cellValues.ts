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

/** A group value exactly as sent, for filters; anything but a string or number is empty. */
export function toRawText(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number'
		? String(value)
		: '';
}

/** A group value as text, trimmed for placing and labelling. */
export function toText(value: unknown): string {
	return toRawText(value).trim();
}
