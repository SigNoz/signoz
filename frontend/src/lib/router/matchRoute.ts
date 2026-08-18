import { matchPath } from 'react-router-dom';

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

	const match = matchPath<Record<string, string | undefined>>(pathname, {
		path: pattern,
		exact: end,
	});

	if (match === null) {
		return null;
	}

	// v6.30 un-escapes `%2F` in param values (and nothing else); v5 hands them
	// back raw. Doing it here keeps `buildRoutePath` -> `matchRoute` a round trip
	// for values containing a slash, on both versions.
	const params = Object.fromEntries(
		Object.entries(match.params).map(([key, value]) => [
			key,
			value?.replace(/%2F/g, '/'),
		]),
	);

	return {
		params: params as AppParams<Key>,
		pathname: match.url,
		pathnameBase: match.url,
		pattern: { path: pattern, caseSensitive: false, end },
	};
}
