const NAV_ROUTES = {
	SERVICE_METRICS: '/services/:servicename',
	TRACE_DETAIL: '/trace/:id',
	TRACES_EXPLORER: '/traces-explorer',
	INSTRUMENTATION: '/get-started',
	USAGE_EXPLORER: '/usage-explorer',
	DASHBOARD: '/dashboard/:dashboardId',
	DASHBOARD_WIDGET: '/dashboard/:dashboardId/:widgetId',
	EDIT_ALERTS: '/alerts/edit',
	LIST_ALL_ALERT: '/alerts',
	ALERTS_NEW: '/alerts/new',
	ALL_CHANNELS: '/settings/channels',
	CHANNELS_NEW: '/settings/channels/new',
	CHANNELS_EDIT: '/settings/channels/:id',
	ORG_SETTINGS: '/settings/org-settings',
	LOGS_EXPLORER: '/logs-explorer',
	LOGS_INDEX_FIELDS: '/logs-explorer/index-fields',
	LOGS_PIPELINE: '/logs-explorer/pipeline',
	TRACE_EXPLORER: '/trace-explorer',
};

const NESTED_ROUTES_MAPPING = {
	SERVICE_METRICS: '/services',
	TRACE_DETAIL: '/trace',
	TRACES_EXPLORER: '/trace',
	INSTRUMENTATION: '/get-started',
	USAGE_EXPLORER: '/usage-explorer',
	DASHBOARD: '/dashboard',
	DASHBOARD_WIDGET: '/dashboard',
	EDIT_ALERTS: '/alerts',
	LIST_ALL_ALERT: '/alerts',
	ALERTS_NEW: '/alerts',
	ALL_CHANNELS: '/settings',
	CHANNELS_NEW: '/settings',
	CHANNELS_EDIT: '/settings',
	ORG_SETTINGS: '/settings',
	LOGS_EXPLORER: '/logs',
	LOGS_INDEX_FIELDS: '/logs',
	LOGS_PIPELINE: '/logs',
	TRACE_EXPLORER: '/trace',
};

export { NAV_ROUTES, NESTED_ROUTES_MAPPING };
