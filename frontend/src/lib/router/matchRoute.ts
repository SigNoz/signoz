import { matchPath } from 'react-router';

import type { AppParams, RouteMatch } from './types';

interface MatchRouteOptions {
	/**
	 * Defaults to `false`, matching v5's string form. v6's `end` defaults to
	 * `true`, so the two call sites that pass no options rely on this default and
	 * would silently flip to exact matching without it.
	 */
	exact?: boolean;
}

export function matchRoute<Key extends string = string>(
	pathname: string,
	pattern: string,
	options: MatchRouteOptions = {},
): RouteMatch<Key> | null {
	const end = options.exact ?? false;

	// v6 un-escapes `%2F` in param values itself (and nothing else), which is
	// what keeps `buildRoutePath` -> `matchRoute` a round trip for a value
	// containing a slash.
	const match = matchPath(
		{ path: pattern, end, caseSensitive: false },
		pathname,
	);

	if (match === null) {
		return null;
	}

	return {
		params: match.params as AppParams<Key>,
		pathname: match.pathname,
		pathnameBase: match.pathnameBase,
		pattern: { path: pattern, caseSensitive: false, end },
	};
}
