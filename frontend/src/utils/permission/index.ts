import ROUTES from 'constants/routes';
import { ROLES } from 'types/roles';

export type ComponentTypes =
	| 'current_org_settings'
	| 'invite_members'
	| 'create_new_dashboards'
	| 'import_dashboard'
	| 'export_dashboard'
	| 'add_new_alert'
	| 'add_new_channel'
	| 'set_retention_period'
	| 'action'
	| 'save_layout'
	| 'edit_dashboard'
	| 'delete_widget'
	| 'new_dashboard'
	| 'new_alert_action'
	| 'edit_widget'
	| 'add_panel'
	| 'page_pipelines'
	| 'edit_locked_dashboard'
	| 'add_panel_locked_dashboard';

export const componentPermission: Record<ComponentTypes, ROLES[]> = {
	current_org_settings: ['ADMIN'],
	invite_members: ['ADMIN'],
	create_new_dashboards: ['ADMIN', 'EDITOR'],
	import_dashboard: ['ADMIN', 'EDITOR'],
	export_dashboard: ['ADMIN', 'EDITOR', 'VIEWER'],
	add_new_alert: ['ADMIN', 'EDITOR'],
	add_new_channel: ['ADMIN'],
	set_retention_period: ['ADMIN'],
	action: ['ADMIN', 'EDITOR'],
	save_layout: ['ADMIN', 'EDITOR', 'AUTHOR'],
	edit_dashboard: ['ADMIN', 'EDITOR', 'AUTHOR'],
	delete_widget: ['ADMIN', 'EDITOR', 'AUTHOR'],
	new_dashboard: ['ADMIN', 'EDITOR'],
	new_alert_action: ['ADMIN'],
	edit_widget: ['ADMIN', 'EDITOR'],
	add_panel: ['ADMIN', 'EDITOR', 'AUTHOR'],
	page_pipelines: ['ADMIN', 'EDITOR'],
	edit_locked_dashboard: ['ADMIN', 'AUTHOR'],
	add_panel_locked_dashboard: ['ADMIN', 'AUTHOR'],
};

export const routePermission: Record<keyof typeof ROUTES, ROLES[]> = {
	ALERTS_NEW: ['ADMIN', 'EDITOR'],
	ORG_SETTINGS: ['ADMIN'],
	MY_SETTINGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SERVICE_MAP: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALL_CHANNELS: ['ADMIN', 'EDITOR', 'VIEWER'],
	INGESTION_SETTINGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALL_DASHBOARD: ['ADMIN', 'EDITOR', 'VIEWER'],
	MESSAGING_QUEUES_KAFKA: ['ADMIN', 'EDITOR', 'VIEWER'],
	MESSAGING_QUEUES_KAFKA_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALL_ERROR: ['ADMIN', 'EDITOR', 'VIEWER'],
	APPLICATION: ['ADMIN', 'EDITOR', 'VIEWER'],
	CHANNELS_EDIT: ['ADMIN'],
	CHANNELS_NEW: ['ADMIN'],
	DASHBOARD: ['ADMIN', 'EDITOR', 'VIEWER'],
	DASHBOARD_WIDGET: ['ADMIN', 'EDITOR', 'VIEWER'],
	EDIT_ALERTS: ['ADMIN', 'EDITOR'],
	ERROR_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	HOME_PAGE: ['ADMIN', 'EDITOR', 'VIEWER'],
	LIST_ALL_ALERT: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALERT_HISTORY: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALERT_OVERVIEW: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGIN: ['ADMIN', 'EDITOR', 'VIEWER'],
	NOT_FOUND: ['ADMIN', 'VIEWER', 'EDITOR'],
	PASSWORD_RESET: ['ADMIN', 'EDITOR', 'VIEWER'],
	SERVICE_METRICS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SETTINGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SIGN_UP: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACES_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	UN_AUTHORIZED: ['ADMIN', 'EDITOR', 'VIEWER'],
	USAGE_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	VERSION: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	LIVE_LOGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	LIST_LICENSES: ['ADMIN'],
	LOGS_INDEX_FIELDS: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS_PIPELINES: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	GET_STARTED: ['ADMIN', 'EDITOR', 'VIEWER'],
	ONBOARDING: ['ADMIN'],
	GET_STARTED_APPLICATION_MONITORING: ['ADMIN', 'EDITOR', 'VIEWER'],
	GET_STARTED_INFRASTRUCTURE_MONITORING: ['ADMIN', 'EDITOR', 'VIEWER'],
	GET_STARTED_LOGS_MANAGEMENT: ['ADMIN', 'EDITOR', 'VIEWER'],
	GET_STARTED_AWS_MONITORING: ['ADMIN', 'EDITOR', 'VIEWER'],
	GET_STARTED_AZURE_MONITORING: ['ADMIN', 'EDITOR', 'VIEWER'],
	WORKSPACE_LOCKED: ['ADMIN', 'EDITOR', 'VIEWER'],
	WORKSPACE_SUSPENDED: ['ADMIN', 'EDITOR', 'VIEWER'],
	BILLING: ['ADMIN'],
	SUPPORT: ['ADMIN', 'EDITOR', 'VIEWER'],
	SOMETHING_WENT_WRONG: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS_SAVE_VIEWS: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACES_SAVE_VIEWS: ['ADMIN', 'EDITOR', 'VIEWER'],
	API_KEYS: ['ADMIN'],
	CUSTOM_DOMAIN_SETTINGS: ['ADMIN'],
	LOGS_BASE: [],
	OLD_LOGS_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	SHORTCUTS: ['ADMIN', 'EDITOR', 'VIEWER'],
	INTEGRATIONS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SERVICE_TOP_LEVEL_OPERATIONS: ['ADMIN', 'EDITOR', 'VIEWER'],
	INFRASTRUCTURE_MONITORING_HOSTS: ['ADMIN', 'EDITOR', 'VIEWER'],
	INFRASTRUCTURE_MONITORING_KUBERNETES: ['ADMIN', 'EDITOR', 'VIEWER'],
	MESSAGING_QUEUES_CELERY_TASK: ['ADMIN', 'EDITOR', 'VIEWER'],
	MESSAGING_QUEUES_OVERVIEW: ['ADMIN', 'EDITOR', 'VIEWER'],
	METRICS_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	METRICS_EXPLORER_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	METRICS_EXPLORER_VIEWS: ['ADMIN', 'EDITOR', 'VIEWER'],
};
