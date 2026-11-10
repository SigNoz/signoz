/**
 * These prefixes are added to attribute keys based on their context.
 */
export const FIELD_CONTEXT_PREFIXES = [
	'metric',
	'log',
	'span',
	'trace',
	'resource',
	'scope',
	'attribute',
	'event',
	'body',
];

/**
 * Removes the field context prefix from a key to get the base key name.
 * Example: 'resource.service.name' -> 'service.name'
 * Example: 'attribute.http.method' -> 'http.method'
 */
export function getKeyWithoutPrefix(key: string | undefined): string {
	if (!key) {
		return '';
	}
	const prefixPattern = new RegExp(
		`^(${FIELD_CONTEXT_PREFIXES.join('|')})\\.`,
		'i',
	);
	return key.replace(prefixPattern, '').trim();
}

/**
 * Compares two keys by their base name (without prefix).
 * This ensures that 'service.name' matches 'resource.service.name'
 */
export function isKeyMatch(
	itemKey: string | undefined,
	filterKey: string | undefined,
): boolean {
	return getKeyWithoutPrefix(itemKey) === getKeyWithoutPrefix(filterKey);
}

/**
 * Every spelling of a key that `isKeyMatch` treats as equal: the base name plus
 * each context-prefixed form. Expression rewrites match keys literally, so they
 * need the whole list where the items side only needs `isKeyMatch`.
 */
export function getKeySpellings(key: string | undefined): string[] {
	const base = getKeyWithoutPrefix(key);
	if (!base) {
		return [];
	}
	return [base, ...FIELD_CONTEXT_PREFIXES.map((prefix) => `${prefix}.${base}`)];
}
