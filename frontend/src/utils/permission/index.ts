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
	| 'add_panel_locked_dashboard'
	| 'manage_llm_pricing';

/**
 * @deprecated Before adding a new value here, check if what you want to add permission is supported by authz.
 * If so, read AuthZ Guidelines on how to add permission check via AuthZ.
 * If not, you can keep adding to this record.
 */
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
	manage_llm_pricing: ['ADMIN'],
};

/**
 * @deprecated You can still add new permissions/routes here but be aware if this page/module supports authz.
 * If so, also implement the correct authz checks in the page itself, and here you can add ADMIN/EDITOR/VIEWER,
 * and also update/include the route at {@link routeWithInitialAuthZSupport}
 */
export const routePermission: Record<keyof typeof ROUTES, ROLES[]> = {
	HOME: ['ADMIN', 'EDITOR', 'VIEWER'],
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
	DASHBOARD_PANEL_EDITOR: ['ADMIN', 'EDITOR', 'VIEWER'],
	EDIT_ALERTS: ['ADMIN', 'EDITOR'],
	ERROR_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	HOME_PAGE: ['ADMIN', 'EDITOR', 'VIEWER'],
	LIST_ALL_ALERT: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALERT_HISTORY: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALERT_OVERVIEW: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGIN: ['ADMIN', 'EDITOR', 'VIEWER'],
	FORGOT_PASSWORD: ['ADMIN', 'EDITOR', 'VIEWER'],
	NOT_FOUND: ['ADMIN', 'VIEWER', 'EDITOR', 'ANONYMOUS'],
	PASSWORD_RESET: ['ADMIN', 'EDITOR', 'VIEWER'],
	SERVICE_METRICS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SETTINGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SIGN_UP: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACES_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE_DETAIL_OLD: ['ADMIN', 'EDITOR', 'VIEWER'],
	// Every role must be able to land here - a role missing from this list is
	// redirected to /un-authorized and then redirected off it again, looping.
	UN_AUTHORIZED: ['ADMIN', 'EDITOR', 'VIEWER', 'ANONYMOUS', 'AUTHOR'],
	USAGE_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	VERSION: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	LIVE_LOGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	LIST_LICENSES: ['ADMIN'],
	LOGS_INDEX_FIELDS: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS_PIPELINES: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	ONBOARDING: ['ADMIN'],
	GET_STARTED_WITH_CLOUD: ['ADMIN', 'EDITOR'],
	WORKSPACE_LOCKED: ['ADMIN', 'EDITOR', 'VIEWER'],
	WORKSPACE_SUSPENDED: ['ADMIN', 'EDITOR', 'VIEWER'],
	ROLES_SETTINGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	ROLE_CREATE: ['ADMIN', 'EDITOR', 'VIEWER'],
	ROLE_DETAILS: ['ADMIN', 'EDITOR', 'VIEWER'],
	ROLE_EDIT: ['ADMIN', 'EDITOR', 'VIEWER'],
	MEMBERS_SETTINGS: ['ADMIN'],
	SERVICE_ACCOUNTS_SETTINGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	BILLING: ['ADMIN', 'EDITOR', 'VIEWER'],
	SUPPORT: ['ADMIN', 'EDITOR', 'VIEWER', 'ANONYMOUS'],
	SOMETHING_WENT_WRONG: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS_SAVE_VIEWS: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACES_SAVE_VIEWS: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACES_FUNNELS: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACES_FUNNELS_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGS_BASE: ['ADMIN', 'EDITOR', 'VIEWER'],
	OLD_LOGS_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	SHORTCUTS: ['ADMIN', 'EDITOR', 'VIEWER'],
	INTEGRATIONS: ['ADMIN', 'EDITOR', 'VIEWER'],
	INTEGRATIONS_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	SERVICE_TOP_LEVEL_OPERATIONS: ['ADMIN', 'EDITOR', 'VIEWER'],
	INFRASTRUCTURE_MONITORING_HOSTS: ['ADMIN', 'EDITOR', 'VIEWER'],
	INFRASTRUCTURE_MONITORING_KUBERNETES: ['ADMIN', 'EDITOR', 'VIEWER'],
	MESSAGING_QUEUES_CELERY_TASK: ['ADMIN', 'EDITOR', 'VIEWER'],
	MESSAGING_QUEUES_OVERVIEW: ['ADMIN', 'EDITOR', 'VIEWER'],
	METRICS_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	METRICS_EXPLORER_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	METRICS_EXPLORER_VIEWS: ['ADMIN', 'EDITOR', 'VIEWER'],
	METRICS_EXPLORER_VOLUME_CONTROL: ['ADMIN', 'EDITOR', 'VIEWER'],
	API_MONITORING: ['ADMIN', 'EDITOR', 'VIEWER'],
	WORKSPACE_ACCESS_RESTRICTED: ['ADMIN', 'EDITOR', 'VIEWER'],
	METRICS_EXPLORER_BASE: ['ADMIN', 'EDITOR', 'VIEWER'],
	INFRASTRUCTURE_MONITORING_BASE: ['ADMIN', 'EDITOR', 'VIEWER'],
	API_MONITORING_BASE: ['ADMIN', 'EDITOR', 'VIEWER'],
	MESSAGING_QUEUES_BASE: ['ADMIN', 'EDITOR', 'VIEWER'],
	METER_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	METER: ['ADMIN', 'EDITOR', 'VIEWER'],
	METER_EXPLORER_VIEWS: ['ADMIN', 'EDITOR', 'VIEWER'],
	PUBLIC_DASHBOARD: ['ADMIN', 'EDITOR', 'VIEWER'],
	AI_ASSISTANT: ['ADMIN', 'EDITOR', 'VIEWER'],
	AI_ASSISTANT_ICON_PREVIEW: ['ADMIN', 'EDITOR', 'VIEWER'],
	MCP_SERVER: ['ADMIN', 'EDITOR', 'VIEWER'],
	AI_ASSISTANT_BASE: ['ADMIN', 'EDITOR', 'VIEWER'],
	AI_OBSERVABILITY_ATTRIBUTE_MAPPING: ['ADMIN', 'EDITOR', 'VIEWER'],
	AI_OBSERVABILITY_BASE: ['ADMIN', 'EDITOR', 'VIEWER'],
	AI_OBSERVABILITY_OVERVIEW: ['ADMIN', 'EDITOR', 'VIEWER'],
	AI_OBSERVABILITY_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	AI_OBSERVABILITY_CONFIGURATION: ['ADMIN', 'EDITOR', 'VIEWER'],
};

/**
 * Any route that will start be supported under AuthZ should be added here.
 * This will help correctly identify when fallback to show the page
 * or just return unauthorized.
 *
 * This prevents us from adding `ANONYMOUS` on the `routePermission`
 */
export const routeWithInitialAuthZSupport = {
	MY_SETTINGS: true,
	SETTINGS: true,
	TRACES_EXPLORER: true,
	TRACE: true,
	TRACE_DETAIL: true,
	TRACE_DETAIL_OLD: true,
	LOGS: true,
	LOGS_EXPLORER: true,
	LIVE_LOGS: true,
	ROLES_SETTINGS: true,
	ROLE_CREATE: true,
	ROLE_DETAILS: true,
	ROLE_EDIT: true,
	SERVICE_ACCOUNTS_SETTINGS: true,
	SUPPORT: true,
	OLD_LOGS_EXPLORER: true,
	METRICS_EXPLORER: true,
	METRICS_EXPLORER_EXPLORER: true,
	METRICS_EXPLORER_VOLUME_CONTROL: true,
	METER_EXPLORER: true,
	METER: true,
	WORKSPACE_LOCKED: true,
	WORKSPACE_SUSPENDED: true,
	WORKSPACE_ACCESS_RESTRICTED: true,
	BILLING: true,
} as const satisfies Partial<Record<keyof typeof ROUTES, true>>;
