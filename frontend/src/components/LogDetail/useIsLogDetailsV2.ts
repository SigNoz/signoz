import ROUTES from 'constants/routes';
import { useAppLocation } from 'lib/router/useAppLocation';

export function useIsLogDetailsV2(): boolean {
	const { pathname } = useAppLocation();
	return (
		pathname === ROUTES.LOGS_EXPLORER ||
		pathname.startsWith(ROUTES.INFRASTRUCTURE_MONITORING_BASE) ||
		pathname.startsWith(`${ROUTES.ALL_DASHBOARD}/`)
	);
}
