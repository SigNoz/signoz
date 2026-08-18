import { generatePath } from 'react-router-dom';

/**
 * Fills `:param` segments in a route pattern.
 *
 * Contract: **param values are URI-encoded** — `/`, `?` and `#` come back
 * percent-encoded, so a value can never introduce extra path segments or a
 * query string. v5's `generatePath` does this via path-to-regexp; v6.30's does
 * no encoding at all (`String(param)` per segment), so at the version flip this
 * module has to encode before delegating. The unit tests pin the output so that
 * swap cannot change any URL.
 */
export function buildRoutePath(
	pattern: string,
	params?: Record<string, string | number | boolean>,
): string {
	return generatePath(pattern, params);
}
