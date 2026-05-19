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

	const dynamic = entries.find(
		([, value]) => value.includes(':') && templateToRegex(value).test(pathname),
	);

	return dynamic?.[0] ?? 'DEFAULT';
}
