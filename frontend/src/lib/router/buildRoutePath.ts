import { generatePath } from 'react-router';

/**
 * Fills `:param` segments in a route pattern.
 *
 * Contract: **param values are passed raw and come back percent-encoded**.
 * `generatePath` runs each one through `encodeURIComponent`, so a value can
 * never introduce extra path segments or a query string. Handing it a value
 * that is already encoded double-encodes it: read params back with
 * `matchRoute` / `useAppParams`, which un-escape only `%2F`, and decode before
 * passing one here.
 *
 * v7's `generatePath` types params as `string | null`, so non-strings are
 * stringified here rather than at the 25 call sites.
 */
export function buildRoutePath(
	pattern: string,
	params?: Record<string, string | number | boolean>,
): string {
	if (params === undefined) {
		return generatePath(pattern);
	}

	const stringified = Object.fromEntries(
		Object.entries(params).map(([key, value]) => [key, String(value)]),
	);

	return generatePath(pattern, stringified);
}
