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
	| 'add_panel';

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
	save_layout: ['ADMIN', 'EDITOR'],
	edit_dashboard: ['ADMIN', 'EDITOR'],
	delete_widget: ['ADMIN', 'EDITOR'],
	new_dashboard: ['ADMIN', 'EDITOR'],
	new_alert_action: ['ADMIN'],
	edit_widget: ['ADMIN', 'EDITOR'],
	add_panel: ['ADMIN', 'EDITOR'],
};

export const routePermission: Record<keyof typeof ROUTES, ROLES[]> = {
	ALERTS_NEW: ['ADMIN', 'EDITOR'],
	ORG_SETTINGS: ['ADMIN'],
	MY_SETTINGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SERVICE_MAP: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALL_CHANNELS: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALL_DASHBOARD: ['ADMIN', 'EDITOR', 'VIEWER'],
	ALL_ERROR: ['ADMIN', 'EDITOR', 'VIEWER'],
	APPLICATION: ['ADMIN', 'EDITOR', 'VIEWER'],
	CHANNELS_EDIT: ['ADMIN'],
	CHANNELS_NEW: ['ADMIN'],
	DASHBOARD: ['ADMIN', 'EDITOR', 'VIEWER'],
	DASHBOARD_WIDGET: ['ADMIN', 'EDITOR', 'VIEWER'],
	EDIT_ALERTS: ['ADMIN'],
	ERROR_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	HOME_PAGE: ['ADMIN', 'EDITOR', 'VIEWER'],
	INSTRUMENTATION: ['ADMIN', 'EDITOR', 'VIEWER'],
	LIST_ALL_ALERT: ['ADMIN', 'EDITOR', 'VIEWER'],
	LOGIN: ['ADMIN', 'EDITOR', 'VIEWER'],
	NOT_FOUND: ['ADMIN', 'VIEWER', 'EDITOR'],
	PASSWORD_RESET: ['ADMIN', 'EDITOR', 'VIEWER'],
	SERVICE_METRICS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SETTINGS: ['ADMIN', 'EDITOR', 'VIEWER'],
	SIGN_UP: ['ADMIN', 'EDITOR', 'VIEWER'],
	SOMETHING_WENT_WRONG: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE: ['ADMIN', 'EDITOR', 'VIEWER'],
	TRACE_DETAIL: ['ADMIN', 'EDITOR', 'VIEWER'],
	UN_AUTHORIZED: ['ADMIN', 'EDITOR', 'VIEWER'],
	USAGE_EXPLORER: ['ADMIN', 'EDITOR', 'VIEWER'],
	VERSION: ['ADMIN', 'EDITOR', 'VIEWER'],
};
