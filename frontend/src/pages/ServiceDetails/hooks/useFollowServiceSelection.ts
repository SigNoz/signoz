import { useEffect, useRef } from 'react';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { getCurrentLocation } from 'lib/router/navigation';
import { buildRoutePath } from 'lib/router/buildRoutePath';
import { selectVariableValues } from 'pages/DashboardPage/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

/**
 * Moves the route to the service picked in the dashboard's service variable.
 * Waits until the selection first matches the route: until the page's seed
 * lands, the store may still hold the service from an earlier visit.
 */
export function useFollowServiceSelection(
	dashboardId: string,
	serviceName: string,
): void {
	const selected = useDashboardStore(selectVariableValues(dashboardId))
		.service_name?.value;
	const hasSeeded = useRef(false);
	const { safeNavigate } = useSafeNavigate();

	useEffect(() => {
		if (selected === serviceName) {
			hasSeeded.current = true;
			return;
		}
		if (!hasSeeded.current || typeof selected !== 'string' || !selected) {
			return;
		}
		const path = buildRoutePath(ROUTES.SERVICE_METRICS, {
			servicename: selected,
		});
		safeNavigate(`${path}${getCurrentLocation().search}`);
	}, [selected, serviceName, safeNavigate]);
}
