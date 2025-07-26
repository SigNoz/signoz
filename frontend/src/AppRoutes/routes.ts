import ROUTES from 'constants/routes';
import MessagingQueues from 'pages/MessagingQueues';
import React from 'react';
import { RouteProps } from 'react-router-dom-v5-compat';

import {
	AlertHistory,
	AlertOverview,
	AllAlertChannelsPage,
	AllErrors,
	APIKeys,
	ApiMonitoring,
	BillingPage,
	ChannelsEditPage,
	CreateAlertChannelAlerts,
	CreateNewAlerts,
	CustomDomainSettings,
	DashboardPage,
	DashboardWidget,
	EditRulesPage,
	ErrorDetails,
	GeneralSettings,
	Home,
	InfrastructureMonitoring,
	IngestionSettings,
	InstalledIntegrations,
	LicensePage,
	ListAllALertsPage,
	LiveLogs,
	Login,
	Logs,
	LogsExplorer,
	LogsIndexToFields,
	LogsSaveViews,
	MetricsExplorer,
	MySettings,
	NewDashboardPage,
	OldLogsExplorer,
	Onboarding,
	OnboardingV2,
	OrganizationSettingsPage,
	OrgOnboarding,
	PasswordReset,
	PipelinePage,
	ServiceMapPage,
	ServiceMetricsPage,
	ServicesTablePage,
	ServiceTopLevelOperationsPage,
	SettingsPage,
	ShortcutsPage,
	SignupPage,
	SomethingWentWrong,
	StatusPage,
	SupportPage,
	TraceDetail,
	TraceFilter,
	TracesExplorer,
	TracesFunnelDetails,
	TracesFunnels,
	TracesSaveViews,
	UnAuthorized,
	UsageExplorerPage,
	WorkspaceAccessRestricted,
	WorkspaceBlocked,
	WorkspaceSuspended,
} from './pageComponents';

const routes: AppRoutes[] = [
	{
		element: SignupPage,
		path: ROUTES.SIGN_UP,
		isPrivate: false,
		key: 'SIGN_UP',
	},
	{
		path: ROUTES.GET_STARTED,
		element: Onboarding,
		isPrivate: true,
		key: 'GET_STARTED',
	},
	{
		path: ROUTES.GET_STARTED_WITH_CLOUD,
		element: OnboardingV2,
		isPrivate: true,
		key: 'GET_STARTED_WITH_CLOUD',
	},
	{
		path: ROUTES.HOME,
		element: Home,
		isPrivate: true,
		key: 'HOME',
	},
	{
		path: ROUTES.ONBOARDING,
		element: OrgOnboarding,
		isPrivate: true,
		key: 'ONBOARDING',
	},
	{
		element: LogsIndexToFields,
		path: ROUTES.LOGS_INDEX_FIELDS,
		isPrivate: true,
		key: 'LOGS_INDEX_FIELDS',
	},
	{
		element: ServicesTablePage,
		path: ROUTES.APPLICATION,
		isPrivate: true,
		key: 'APPLICATION',
	},
	{
		path: ROUTES.SERVICE_METRICS,
		element: ServiceMetricsPage,
		isPrivate: true,
		key: 'SERVICE_METRICS',
	},
	{
		path: ROUTES.SERVICE_TOP_LEVEL_OPERATIONS,
		element: ServiceTopLevelOperationsPage,
		isPrivate: true,
		key: 'SERVICE_TOP_LEVEL_OPERATIONS',
	},
	{
		path: ROUTES.SERVICE_MAP,
		element: ServiceMapPage,
		isPrivate: true,
		key: 'SERVICE_MAP',
	},
	{
		path: ROUTES.LOGS_SAVE_VIEWS,
		element: LogsSaveViews,
		isPrivate: true,
		key: 'LOGS_SAVE_VIEWS',
	},
	{
		path: ROUTES.TRACE_DETAIL,
		element: TraceDetail,
		isPrivate: true,
		key: 'TRACE_DETAIL',
	},
	{
		path: ROUTES.SETTINGS,
		element: SettingsPage,
		isPrivate: true,
		key: 'SETTINGS',
		children: [
			{
				path: '', // Route for /settings
				element: GeneralSettings,
				isPrivate: true,
				key: 'SETTINGS',
			},
			{
				path: 'my-settings',
				element: MySettings,
				isPrivate: true,
				key: 'MY_SETTINGS',
			},
			{
				path: 'custom-domain-settings',
				element: CustomDomainSettings,
				isPrivate: true,
				key: 'CUSTOM_DOMAIN_SETTINGS',
			},
			{
				path: 'org-settings',
				element: OrganizationSettingsPage,
				isPrivate: true,
				key: 'ORG_SETTINGS',
			},
			{
				path: 'channels',
				element: AllAlertChannelsPage,
				isPrivate: true,
				key: 'ALL_CHANNELS',
			},
			{
				path: 'ingestion-settings',
				element: IngestionSettings,
				isPrivate: true,
				key: 'INGESTION_SETTINGS',
			},
			{
				path: 'api-keys',
				element: APIKeys,
				isPrivate: true,
				key: 'API_KEYS',
			},
			{
				path: 'billing',
				element: BillingPage,
				isPrivate: true,
				key: 'BILLING',
			},
			{
				path: 'shortcuts',
				element: ShortcutsPage,
				isPrivate: true,
				key: 'SHORTCUTS',
			},
			{
				path: 'channels/new',
				element: CreateAlertChannelAlerts,
				isPrivate: true,
				key: 'CHANNELS_NEW',
			},
			{
				path: 'channels/edit/:channelId',
				element: ChannelsEditPage,
				isPrivate: true,
				key: 'CHANNELS_EDIT',
			},
		],
	},
	{
		path: ROUTES.USAGE_EXPLORER,
		element: UsageExplorerPage,
		isPrivate: true,
		key: 'USAGE_EXPLORER',
	},
	{
		path: ROUTES.ALL_DASHBOARD,
		element: DashboardPage,
		isPrivate: true,
		key: 'ALL_DASHBOARD',
	},
	{
		path: ROUTES.DASHBOARD,
		element: NewDashboardPage,
		isPrivate: true,
		key: 'DASHBOARD',
	},
	{
		path: ROUTES.DASHBOARD_WIDGET,
		element: DashboardWidget,
		isPrivate: true,
		key: 'DASHBOARD_WIDGET',
	},
	{
		path: ROUTES.EDIT_ALERTS,
		element: EditRulesPage,
		isPrivate: true,
		key: 'EDIT_ALERTS',
	},
	{
		path: ROUTES.LIST_ALL_ALERT,
		element: ListAllALertsPage,
		isPrivate: true,
		key: 'LIST_ALL_ALERT',
	},
	{
		path: ROUTES.ALERTS_NEW,
		element: CreateNewAlerts,
		isPrivate: true,
		key: 'ALERTS_NEW',
	},
	{
		path: ROUTES.ALERT_HISTORY,
		element: AlertHistory,
		isPrivate: true,
		key: 'ALERT_HISTORY',
	},
	{
		path: ROUTES.ALERT_OVERVIEW,
		element: AlertOverview,
		isPrivate: true,
		key: 'ALERT_OVERVIEW',
	},
	{
		path: ROUTES.TRACE,
		element: TraceFilter,
		isPrivate: true,
		key: 'TRACE',
	},
	{
		path: ROUTES.TRACES_EXPLORER,
		element: TracesExplorer,
		isPrivate: true,
		key: 'TRACES_EXPLORER',
	},
	{
		path: ROUTES.TRACES_SAVE_VIEWS,
		element: TracesSaveViews,
		isPrivate: true,
		key: 'TRACES_SAVE_VIEWS',
	},
	{
		path: ROUTES.TRACES_FUNNELS,
		element: TracesFunnels,
		isPrivate: true,
		key: 'TRACES_FUNNELS',
	},
	{
		path: ROUTES.TRACES_FUNNELS_DETAIL,
		element: TracesFunnelDetails,
		isPrivate: true,
		key: 'TRACES_FUNNELS_DETAIL',
	},
	{
		path: ROUTES.ALL_ERROR,
		isPrivate: true,
		element: AllErrors,
		key: 'ALL_ERROR',
	},
	{
		path: ROUTES.ERROR_DETAIL,
		element: ErrorDetails,
		isPrivate: true,
		key: 'ERROR_DETAIL',
	},
	{
		path: ROUTES.VERSION,
		element: StatusPage,
		isPrivate: true,
		key: 'VERSION',
	},
	{
		path: ROUTES.LOGS,
		element: Logs,
		key: 'LOGS',
		isPrivate: true,
	},
	{
		path: ROUTES.LOGS_EXPLORER,
		element: LogsExplorer,
		key: 'LOGS_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.OLD_LOGS_EXPLORER,
		element: OldLogsExplorer,
		key: 'OLD_LOGS_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.LIVE_LOGS,
		element: LiveLogs,
		key: 'LIVE_LOGS',
		isPrivate: true,
	},
	{
		path: ROUTES.LOGS_PIPELINES,
		element: PipelinePage,
		key: 'LOGS_PIPELINES',
		isPrivate: true,
	},
	{
		path: ROUTES.LOGIN,
		element: Login,
		isPrivate: false,
		key: 'LOGIN',
	},
	{
		path: ROUTES.UN_AUTHORIZED,
		element: UnAuthorized,
		key: 'UN_AUTHORIZED',
		isPrivate: true,
	},
	{
		path: ROUTES.PASSWORD_RESET,
		element: PasswordReset,
		key: 'PASSWORD_RESET',
		isPrivate: false,
	},
	{
		path: ROUTES.SOMETHING_WENT_WRONG,
		element: SomethingWentWrong,
		key: 'SOMETHING_WENT_WRONG',
		isPrivate: false,
	},
	{
		path: ROUTES.WORKSPACE_LOCKED,
		element: WorkspaceBlocked,
		isPrivate: true,
		key: 'WORKSPACE_LOCKED',
	},
	{
		path: ROUTES.WORKSPACE_SUSPENDED,
		element: WorkspaceSuspended,
		isPrivate: true,
		key: 'WORKSPACE_SUSPENDED',
	},
	{
		path: ROUTES.WORKSPACE_ACCESS_RESTRICTED,
		element: WorkspaceAccessRestricted,
		isPrivate: true,
		key: 'WORKSPACE_ACCESS_RESTRICTED',
	},
	{
		path: ROUTES.INTEGRATIONS,
		element: InstalledIntegrations,
		isPrivate: true,
		key: 'INTEGRATIONS',
	},
	{
		path: ROUTES.MESSAGING_QUEUES_KAFKA,
		element: MessagingQueues,
		key: 'MESSAGING_QUEUES_KAFKA',
		isPrivate: true,
	},
	{
		path: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
		element: MessagingQueues,
		key: 'MESSAGING_QUEUES_CELERY_TASK',
		isPrivate: true,
	},
	{
		path: ROUTES.MESSAGING_QUEUES_OVERVIEW,
		element: MessagingQueues,
		key: 'MESSAGING_QUEUES_OVERVIEW',
		isPrivate: true,
	},
	{
		path: ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL,
		element: MessagingQueues,
		key: 'MESSAGING_QUEUES_KAFKA_DETAIL',
		isPrivate: true,
	},
	{
		path: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
		element: InfrastructureMonitoring,
		key: 'INFRASTRUCTURE_MONITORING_HOSTS',
		isPrivate: true,
	},
	{
		path: ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES,
		element: InfrastructureMonitoring,
		key: 'INFRASTRUCTURE_MONITORING_KUBERNETES',
		isPrivate: true,
	},
	{
		path: ROUTES.METRICS_EXPLORER,
		element: MetricsExplorer,
		key: 'METRICS_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.METRICS_EXPLORER_EXPLORER,
		element: MetricsExplorer,
		key: 'METRICS_EXPLORER_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.METRICS_EXPLORER_VIEWS,
		element: MetricsExplorer,
		key: 'METRICS_EXPLORER_VIEWS',
		isPrivate: true,
	},
	{
		path: ROUTES.API_MONITORING,
		element: ApiMonitoring,
		key: 'API_MONITORING',
		isPrivate: true,
	},
];

export const SUPPORT_ROUTE: AppRoutes = {
	path: ROUTES.SUPPORT,
	element: SupportPage,
	key: 'SUPPORT',
	isPrivate: true,
};

export const LIST_LICENSES: AppRoutes = {
	path: ROUTES.LIST_LICENSES,
	element: LicensePage,
	isPrivate: true,
	key: 'LIST_LICENSES',
};

export const oldRoutes = [
	'/pipelines',
	'/logs-explorer',
	'/logs-explorer/live',
	'/logs-save-views',
	'/traces-save-views',
	'/settings/access-tokens',
	'/messaging-queues',
	'/alerts/edit',
];

export const oldNewRoutesMapping: Record<string, string> = {
	'/pipelines': '/logs/pipelines',
	'/logs-explorer': '/logs/logs-explorer',
	'/logs-explorer/live': '/logs/logs-explorer/live',
	'/logs-save-views': '/logs/saved-views',
	'/traces-save-views': '/traces/saved-views',
	'/settings/access-tokens': '/settings/api-keys',
	'/messaging-queues': '/messaging-queues/overview',
	'/alerts/edit': '/alerts/overview',
};

export const ROUTES_NOT_TO_BE_OVERRIDEN: string[] = [
	ROUTES.WORKSPACE_LOCKED,
	ROUTES.WORKSPACE_SUSPENDED,
];

export interface AppRoutes {
	element:
		| React.ComponentType<any>
		| React.LazyExoticComponent<React.ComponentType<any>>;
	path: RouteProps['path'];
	isPrivate: boolean;
	key: keyof typeof ROUTES;
	children?: AppRoutes[];
}

export default routes;
