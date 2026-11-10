import ROUTES from 'constants/routes';
import type { AppLocation } from 'lib/router/types';

// The alert details Overview tab renders the same editor as the edit route.
const EQUIVALENT_PATHNAMES: Record<string, string[]> = {
	[ROUTES.EDIT_ALERTS]: [ROUTES.ALERT_OVERVIEW],
};

// Extra params on the current page (time range, view options) don't make it a different resource.
export function isOnResourcePage(
	path: string,
	location: Pick<AppLocation, 'pathname' | 'search'>,
): boolean {
	const [pathname, query = ''] = path.split('?');
	const pathnames = [pathname, ...(EQUIVALENT_PATHNAMES[pathname] ?? [])];
	if (!pathnames.includes(location.pathname)) {
		return false;
	}
	const current = new URLSearchParams(location.search);
	return [...new URLSearchParams(query)].every(
		([key, value]) => current.get(key) === value,
	);
}
