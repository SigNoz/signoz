import { useMemo } from 'react';

import { useDashboardFetchRequired } from './useDashboardFetchRequired';

export interface DashboardEventMeta {
	dashboardId: string;
	dashboardName: string;
}

/**
 * Dashboard identity for analytics payloads, sent as a pair: `dashboardId` joins the
 * event back to the record, `dashboardName` is what makes it readable in the funnel.
 */
export function useDashboardEventMeta(): DashboardEventMeta {
	const { dashboard } = useDashboardFetchRequired();

	return useMemo(
		() => ({
			dashboardId: dashboard.id,
			dashboardName: dashboard.spec.display.name,
		}),
		[dashboard.id, dashboard.spec.display.name],
	);
}
