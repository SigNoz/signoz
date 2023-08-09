import ROUTES from 'constants/routes';

export function getRouteKey(pathname: string): string {
	const [routeKey] = Object.entries(ROUTES).find(
		([, value]) => value === pathname,
	) || ['DEFAULT'];

	return routeKey;
}
