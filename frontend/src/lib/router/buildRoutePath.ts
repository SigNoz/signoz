import { generatePath } from 'react-router-dom';

/**
 * Fills `:param` segments in a route pattern.
 *
 * Param values are URI-encoded. `/`, `?` and `#` come back percent-encoded, so
 * a value can never introduce extra path segments or a query string. v5's
 * `generatePath` does this via path-to-regexp; v7's runs `encodeURIComponent`,
 * which also encodes `:`.
 */
export function buildRoutePath(
	pattern: string,
	params?: Record<string, string | number | boolean | undefined>,
): string {
	return generatePath(pattern, params);
}
