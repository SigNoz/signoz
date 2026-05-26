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
