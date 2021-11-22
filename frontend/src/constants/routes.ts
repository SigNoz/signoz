const ROUTES = {
	SIGN_UP: '/signup',
	SERVICE_METRICS: '/application/:servicename',
	SERVICE_MAP: '/service-map',
	TRACES: '/traces',
	TRACE: '/trace',
	TRACE_GRAPH: '/traces/:id',
	SETTINGS: '/settings',
	INSTRUMENTATION: '/add-instrumentation',
	USAGE_EXPLORER: '/usage-explorer',
	APPLICATION: '/application',
	ALL_DASHBOARD: '/dashboard',
	DASHBOARD: '/dashboard/:dashboardId',
	DASHBOARD_WIDGET: '/dashboard/:dashboardId/:widgetId',
	EDIT_ALERTS: '/alerts/edit/:ruleId',
	LIST_ALL_ALERT: '/alerts',
	ALERTS_NEW: '/alerts/new',
	ALL_CHANNELS: '/settings/channels',
	CHANNELS_NEW: '/setting/channels/new',
	CHANNELS_EDIT: '/setting/channels/edit/:id',
};

export default ROUTES;
