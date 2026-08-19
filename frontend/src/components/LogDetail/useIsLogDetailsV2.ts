import ROUTES from 'constants/routes';
import { useLocation } from 'react-router-dom';

// v2 is rolled out only on the logs explorer route for now; every other surface
// (dashboards, infra monitoring, etc.) keeps the v1 log details view.
export function useIsLogDetailsV2(): boolean {
	const { pathname } = useLocation();
	return pathname === ROUTES.LOGS_EXPLORER;
}
