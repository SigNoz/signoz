import ROUTES from 'constants/routes';
import { useLocation } from 'react-router-dom';

export function useIsLogDetailsV2(): boolean {
	const { pathname } = useLocation();
	return (
		pathname === ROUTES.LOGS_EXPLORER ||
		pathname.startsWith(ROUTES.INFRASTRUCTURE_MONITORING_BASE)
	);
}
