import ROUTES from 'constants/routes';
import { QueryParams } from 'constants/query';

/**
 * Resource-type strings the backend uses for `open_resource` and rollback
 * actions. Centralized here so route/module lookups stay in sync.
 */
export const ResourceType = {
	dashboard: 'dashboard',
	alert: 'alert',
	service: 'service',
	channel: 'channel',
	saved_view: 'saved_view',
	logs_explorer: 'logs_explorer',
	traces_explorer: 'traces_explorer',
	metrics_explorer: 'metrics_explorer',
} as const;

/**
 * Resolves an `open_resource` action to an in-app route for synchronous
 * navigation. Returns `null` for `saved_view` — callers must load the view
 * by id and navigate with query-builder state instead.
 */
export function resourceRoute(
	resourceType: string,
	resourceId: string,
): string | null {
	switch (resourceType) {
		case ResourceType.dashboard:
			return ROUTES.DASHBOARD.replace(':dashboardId', resourceId);
		case ResourceType.alert: {
			const params = new URLSearchParams({ [QueryParams.ruleId]: resourceId });
			return `${ROUTES.EDIT_ALERTS}?${params.toString()}`;
		}
		case ResourceType.service:
			return ROUTES.SERVICE_METRICS.replace(':servicename', resourceId);
		case ResourceType.channel:
			return ROUTES.CHANNELS_EDIT.replace(':channelId', resourceId);
		case ResourceType.saved_view:
			return null;
		case ResourceType.logs_explorer:
			return ROUTES.LOGS_EXPLORER;
		case ResourceType.traces_explorer:
			return ROUTES.TRACES_EXPLORER;
		case ResourceType.metrics_explorer:
			return ROUTES.METRICS_EXPLORER_EXPLORER;
		default:
			return null;
	}
}
