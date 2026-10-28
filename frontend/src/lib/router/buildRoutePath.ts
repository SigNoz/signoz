import { generatePath } from 'react-router';

/**
 * Fills `:param` segments in a route pattern.
 *
 * Param values are passed raw and come back percent-encoded. `generatePath`
 * runs each one through `encodeURIComponent`, so a value can never introduce
 * extra path segments or a query string. A value that is already encoded gets
 * encoded twice: read params back with `matchRoute` / `useAppParams`, which
 * un-escape only `%2F`, and decode before passing one here.
 *
 * v7's `generatePath` types params as `string | null`, so non-strings are
 * stringified here. `undefined` values are dropped, which leaves an optional
 * segment out and makes a required one throw.
 */
export function buildRoutePath(
	pattern: string,
	params?: Record<string, string | number | boolean | undefined>,
): string {
	if (params === undefined) {
		return generatePath(pattern);
	}

	const stringified = Object.fromEntries(
		Object.entries(params)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => [key, String(value)]),
	);

	return generatePath(pattern, stringified);
}
