export function unquote(str: string): string {
	if (typeof str !== 'string') {
		return str;
	}

	const trimmed = str.trim();
	const firstChar = trimmed[0];
	const lastChar = trimmed[trimmed.length - 1];

	if ((firstChar === '"' || firstChar === "'") && firstChar === lastChar) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
}

export function isQuoted(str: string): boolean {
	const trimmed = str.trim();
	return trimmed.length >= 2 && /^(["'`])(.*)\1$/.test(trimmed);
}

export type ScalarFieldValue = string | number | boolean;

export function isScalarFieldValue(value: unknown): value is ScalarFieldValue {
	return (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

/**
 * Coerce an arbitrary value to a string for display/storage: nullish → '',
 * objects/arrays → JSON, other primitives → their string form.
 */
export function coerceToString(value: unknown): string {
	if (value == null) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	if (typeof value === 'object') {
		return JSON.stringify(value);
	}
	return '';
}
