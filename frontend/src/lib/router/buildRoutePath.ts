import { generatePath } from 'react-router-dom';

/**
 * v5's `generatePath` percent-encoded param values through path-to-regexp;
 * v6's is `String(param)` per segment and encodes nothing, so the encoding
 * lives here. Reproduces path-to-regexp's "pretty" encoding: `encodeURI`, then
 * the three characters it leaves behind that would change the shape of the URL.
 */
function encodeParam(value: string | number | boolean): string {
	return encodeURI(String(value)).replace(
		/[/?#]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
	);
}

/**
 * Fills `:param` segments in a route pattern.
 *
 * Contract: **param values are URI-encoded** — `/`, `?` and `#` come back
 * percent-encoded, so a value can never introduce extra path segments or a
 * query string.
 */
export function buildRoutePath(
	pattern: string,
	params?: Record<string, string | number | boolean>,
): string {
	if (params === undefined) {
		return generatePath(pattern);
	}

	const encoded = Object.fromEntries(
		Object.entries(params).map(([key, value]) => [key, encodeParam(value)]),
	);

	return generatePath(pattern, encoded);
}
