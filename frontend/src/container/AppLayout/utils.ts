import ROUTES from 'constants/routes';

const PARAM_SEGMENT = /:[^/]+/g;
const REGEX_SPECIALS = /[.+*?^$()[\]{}|\\]/g;

function templateToRegex(template: string): RegExp {
	const pattern = template
		.replace(REGEX_SPECIALS, '\\$&')
		.replace(PARAM_SEGMENT, '[^/]+');
	return new RegExp(`^${pattern}$`);
}

export function getRouteKey(pathname: string): string {
	const entries = Object.entries(ROUTES);

	const exact = entries.find(([, value]) => value === pathname);
	if (exact) {
		return exact[0];
	}

	// First template that matches wins, so declaration order in `ROUTES`
	// matters when templates can overlap. Today's set is unambiguous because
	// `[^/]+` is segment-bounded, but if you ever add a sibling like
	// `/services/list` next to `SERVICE_METRICS: '/services/:servicename'`,
	// list the more-specific (more-static-segments) entry first in `ROUTES`
	// — otherwise the param template will swallow the static path.
	const dynamic = entries.find(
		([, value]) => value.includes(':') && templateToRegex(value).test(pathname),
	);

	return dynamic?.[0] ?? 'DEFAULT';
}

/**
 * Extracts route params from a dynamic route template and pathname.
 * E.g. template='/services/:servicename', pathname='/services/frontend'
 *      returns { servicename: 'frontend' }
 */
export function extractRouteParams(
	template: string,
	pathname: string,
): Record<string, string> {
	const templateParts = template.split('/');
	const pathParts = pathname.split('/');
	const params: Record<string, string> = {};

	templateParts.forEach((part, i) => {
		if (part.startsWith(':') && pathParts[i]) {
			params[part.slice(1)] = decodeURIComponent(pathParts[i]);
		}
	});

	return params;
}

interface RouteMatch {
	key: string;
	params: Record<string, string>;
}

/**
 * Like getRouteKey but also returns extracted URL params.
 */
export function getRouteMatch(pathname: string): RouteMatch {
	const entries = Object.entries(ROUTES);

	const exact = entries.find(([, value]) => value === pathname);
	if (exact) {
		return { key: exact[0], params: {} };
	}

	const dynamic = entries.find(
		([, value]) => value.includes(':') && templateToRegex(value).test(pathname),
	);

	if (dynamic) {
		return {
			key: dynamic[0],
			params: extractRouteParams(dynamic[1], pathname),
		};
	}

	return { key: 'DEFAULT', params: {} };
}
