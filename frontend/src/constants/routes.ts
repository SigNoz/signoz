const ROUTES = {
	SIGN_UP: '/signup',
	LOGIN: '/login',
	SERVICE_METRICS: '/services/:servicename',
	SERVICE_MAP: '/service-map',
	TRACE: '/trace',
	TRACE_DETAIL: '/trace/:id',
	TRACES_EXPLORER: '/traces-explorer',
	GET_STARTED: '/get-started',
	USAGE_EXPLORER: '/usage-explorer',
	APPLICATION: '/services',
	ALL_DASHBOARD: '/dashboard',
	DASHBOARD: '/dashboard/:dashboardId',
	DASHBOARD_WIDGET: '/dashboard/:dashboardId/:widgetId',
	EDIT_ALERTS: '/alerts/edit',
	LIST_ALL_ALERT: '/alerts',
	ALERTS_NEW: '/alerts/new',
	ALL_CHANNELS: '/settings/channels',
	CHANNELS_NEW: '/settings/channels/new',
	CHANNELS_EDIT: '/settings/channels/:id',
	ALL_ERROR: '/exceptions',
	ERROR_DETAIL: '/error-detail',
	VERSION: '/status',
	MY_SETTINGS: '/my-settings',
	SETTINGS: '/settings',
	ORG_SETTINGS: '/settings/org-settings',
	INGESTION_SETTINGS: '/settings/ingestion-settings',
	SOMETHING_WENT_WRONG: '/something-went-wrong',
	UN_AUTHORIZED: '/un-authorized',
	NOT_FOUND: '/not-found',
	LOGS_BASE: '/logs',
	LOGS: '/logs/logs-explorer',
	OLD_LOGS_EXPLORER: '/logs/old-logs-explorer',
	LOGS_EXPLORER: '/logs/logs-explorer',
	LIVE_LOGS: '/logs/logs-explorer/live',
	LOGS_PIPELINES: '/logs/pipelines',
	HOME_PAGE: '/',
	PASSWORD_RESET: '/password-reset',
	LIST_LICENSES: '/licenses',
	LOGS_INDEX_FIELDS: '/logs-explorer/index-fields',
	TRACE_EXPLORER: '/trace-explorer',
	BILLING: '/billing',
	SUPPORT: '/support',
	SAVE_VIEWS: '/save-views',
	WORKSPACE_LOCKED: '/workspace-locked',
} as const;

export default ROUTES;
