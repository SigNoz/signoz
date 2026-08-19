import type { ComponentType } from 'react';
import ROUTES from 'constants/routes';

import {
	AIAssistantPage,
	AlertHistory,
	AlertOverview,
	AllErrors,
	ApiMonitoring,
	ChannelsEdit,
	ChannelsNew,
	CreateNewAlerts,
	DashboardPage,
	DashboardPanelEditorPage,
	DashboardsListPage,
	EditRulesPage,
	ErrorDetails,
	ForgotPassword,
	Home,
	InfrastructureMonitoring,
	Integrations,
	IntegrationsDetailsPage,
	LicensePage,
	ListAllALertsPage,
	LLMObservabilityPage,
	LiveLogs,
	Login,
	Logs,
	LogsIndexToFields,
	LogsSaveViews,
	MessagingQueuesMainPage,
	MeterExplorerPage,
	MetricsExplorer,
	OnboardingV2,
	OrgOnboarding,
	PasswordReset,
	PipelinePage,
	PublicDashboardPage,
	ServiceMapPage,
	ServiceMetricsPage,
	ServicesTablePage,
	ServiceTopLevelOperationsPage,
	SettingsPage,
	SignupPage,
	SomethingWentWrong,
	StatusPage,
	SupportPage,
	TraceDetailV3,
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
		component: SignupPage,
		path: ROUTES.SIGN_UP,
		isPrivate: false,
		key: 'SIGN_UP',
	},
	{
		path: ROUTES.GET_STARTED_WITH_CLOUD,
		nested: true,
		component: OnboardingV2,
		isPrivate: true,
		key: 'GET_STARTED_WITH_CLOUD',
	},
	{
		path: ROUTES.HOME,
		component: Home,
		isPrivate: true,
		key: 'HOME',
	},
	{
		path: ROUTES.ONBOARDING,
		nested: true,
		component: OrgOnboarding,
		isPrivate: true,
		key: 'ONBOARDING',
	},
	{
		component: LogsIndexToFields,
		path: ROUTES.LOGS_INDEX_FIELDS,
		isPrivate: true,
		key: 'LOGS_INDEX_FIELDS',
	},
	{
		component: ServicesTablePage,
		path: ROUTES.APPLICATION,
		isPrivate: true,
		key: 'APPLICATION',
	},
	{
		path: ROUTES.SERVICE_METRICS,
		component: ServiceMetricsPage,
		isPrivate: true,
		key: 'SERVICE_METRICS',
	},
	{
		path: ROUTES.SERVICE_TOP_LEVEL_OPERATIONS,
		component: ServiceTopLevelOperationsPage,
		isPrivate: true,
		key: 'SERVICE_TOP_LEVEL_OPERATIONS',
	},
	{
		path: ROUTES.SERVICE_MAP,
		component: ServiceMapPage,
		isPrivate: true,
		key: 'SERVICE_MAP',
	},
	{
		path: ROUTES.LOGS_SAVE_VIEWS,
		component: LogsSaveViews,
		isPrivate: true,
		key: 'LOGS_SAVE_VIEWS',
	},
	{
		path: ROUTES.TRACE_DETAIL,
		component: TraceDetailV3,
		isPrivate: true,
		key: 'TRACE_DETAIL',
	},
	{
		path: ROUTES.SETTINGS,
		nested: true,
		component: SettingsPage,
		isPrivate: true,
		key: 'SETTINGS',
	},
	{
		path: ROUTES.USAGE_EXPLORER,
		component: UsageExplorerPage,
		isPrivate: true,
		key: 'USAGE_EXPLORER',
	},
	{
		path: ROUTES.ALL_DASHBOARD,
		component: DashboardsListPage,
		isPrivate: true,
		key: 'ALL_DASHBOARD',
	},
	{
		path: ROUTES.DASHBOARD,
		component: DashboardPage,
		isPrivate: true,
		key: 'DASHBOARD',
	},
	{
		path: ROUTES.PUBLIC_DASHBOARD,
		nested: true,
		component: PublicDashboardPage,
		isPrivate: false,
		key: 'PUBLIC_DASHBOARD',
	},
	{
		path: ROUTES.DASHBOARD_PANEL_EDITOR,
		component: DashboardPanelEditorPage,
		isPrivate: true,
		key: 'DASHBOARD_PANEL_EDITOR',
	},
	{
		path: ROUTES.EDIT_ALERTS,
		component: EditRulesPage,
		isPrivate: true,
		key: 'EDIT_ALERTS',
	},
	{
		path: ROUTES.LIST_ALL_ALERT,
		component: ListAllALertsPage,
		isPrivate: true,
		key: 'LIST_ALL_ALERT',
	},
	{
		path: ROUTES.ALERTS_NEW,
		component: CreateNewAlerts,
		isPrivate: true,
		key: 'ALERTS_NEW',
	},
	{
		path: ROUTES.ALERT_HISTORY,
		component: AlertHistory,
		isPrivate: true,
		key: 'ALERT_HISTORY',
	},
	{
		path: ROUTES.ALERT_OVERVIEW,
		component: AlertOverview,
		isPrivate: true,
		key: 'ALERT_OVERVIEW',
	},
	{
		path: ROUTES.TRACES_EXPLORER,
		component: TracesExplorer,
		isPrivate: true,
		key: 'TRACES_EXPLORER',
	},
	{
		path: ROUTES.TRACES_SAVE_VIEWS,
		component: TracesSaveViews,
		isPrivate: true,
		key: 'TRACES_SAVE_VIEWS',
	},
	{
		path: ROUTES.TRACES_FUNNELS,
		component: TracesFunnels,
		isPrivate: true,
		key: 'TRACES_FUNNELS',
	},
	{
		path: ROUTES.TRACES_FUNNELS_DETAIL,
		component: TracesFunnelDetails,
		isPrivate: true,
		key: 'TRACES_FUNNELS_DETAIL',
	},
	{
		path: ROUTES.CHANNELS_NEW,
		component: ChannelsNew,
		isPrivate: true,
		key: 'CHANNELS_NEW',
	},
	{
		path: ROUTES.CHANNELS_EDIT,
		component: ChannelsEdit,
		isPrivate: true,
		key: 'CHANNELS_EDIT',
	},
	{
		path: ROUTES.ALL_ERROR,
		isPrivate: true,
		component: AllErrors,
		key: 'ALL_ERROR',
	},
	{
		path: ROUTES.ERROR_DETAIL,
		component: ErrorDetails,
		isPrivate: true,
		key: 'ERROR_DETAIL',
	},
	{
		path: ROUTES.VERSION,
		component: StatusPage,
		isPrivate: true,
		key: 'VERSION',
	},
	{
		path: ROUTES.LOGS,
		component: Logs,
		key: 'LOGS',
		isPrivate: true,
	},
	{
		path: ROUTES.LIVE_LOGS,
		component: LiveLogs,
		key: 'LIVE_LOGS',
		isPrivate: true,
	},
	{
		path: ROUTES.LOGS_PIPELINES,
		component: PipelinePage,
		key: 'LOGS_PIPELINES',
		isPrivate: true,
	},
	{
		path: ROUTES.LOGIN,
		component: Login,
		isPrivate: false,
		key: 'LOGIN',
	},
	{
		path: ROUTES.FORGOT_PASSWORD,
		component: ForgotPassword,
		isPrivate: false,
		key: 'FORGOT_PASSWORD',
	},
	{
		path: ROUTES.UN_AUTHORIZED,
		component: UnAuthorized,
		key: 'UN_AUTHORIZED',
		isPrivate: true,
	},
	{
		path: ROUTES.PASSWORD_RESET,
		component: PasswordReset,
		key: 'PASSWORD_RESET',
		isPrivate: false,
	},
	{
		path: ROUTES.SOMETHING_WENT_WRONG,
		component: SomethingWentWrong,
		key: 'SOMETHING_WENT_WRONG',
		isPrivate: false,
	},
	{
		path: ROUTES.WORKSPACE_LOCKED,
		component: WorkspaceBlocked,
		isPrivate: true,
		key: 'WORKSPACE_LOCKED',
	},
	{
		path: ROUTES.WORKSPACE_SUSPENDED,
		component: WorkspaceSuspended,
		isPrivate: true,
		key: 'WORKSPACE_SUSPENDED',
	},
	{
		path: ROUTES.WORKSPACE_ACCESS_RESTRICTED,
		component: WorkspaceAccessRestricted,
		isPrivate: true,
		key: 'WORKSPACE_ACCESS_RESTRICTED',
	},
	{
		path: ROUTES.INTEGRATIONS_DETAIL,
		component: IntegrationsDetailsPage,
		isPrivate: true,
		key: 'INTEGRATIONS_DETAIL',
	},
	{
		path: ROUTES.INTEGRATIONS,
		component: Integrations,
		isPrivate: true,
		key: 'INTEGRATIONS',
	},
	{
		path: ROUTES.MESSAGING_QUEUES_KAFKA,
		component: MessagingQueuesMainPage,
		key: 'MESSAGING_QUEUES_KAFKA',
		isPrivate: true,
	},
	{
		path: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
		component: MessagingQueuesMainPage,
		key: 'MESSAGING_QUEUES_CELERY_TASK',
		isPrivate: true,
	},
	{
		path: ROUTES.MESSAGING_QUEUES_OVERVIEW,
		component: MessagingQueuesMainPage,
		key: 'MESSAGING_QUEUES_OVERVIEW',
		isPrivate: true,
	},
	{
		path: ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL,
		component: MessagingQueuesMainPage,
		key: 'MESSAGING_QUEUES_KAFKA_DETAIL',
		isPrivate: true,
	},
	{
		path: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
		component: InfrastructureMonitoring,
		key: 'INFRASTRUCTURE_MONITORING_HOSTS',
		isPrivate: true,
	},
	{
		path: ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES,
		component: InfrastructureMonitoring,
		key: 'INFRASTRUCTURE_MONITORING_KUBERNETES',
		isPrivate: true,
	},
	{
		path: ROUTES.METRICS_EXPLORER,
		component: MetricsExplorer,
		key: 'METRICS_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.METRICS_EXPLORER_EXPLORER,
		component: MetricsExplorer,
		key: 'METRICS_EXPLORER_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.METRICS_EXPLORER_VIEWS,
		component: MetricsExplorer,
		key: 'METRICS_EXPLORER_VIEWS',
		isPrivate: true,
	},
	{
		path: ROUTES.METRICS_EXPLORER_VOLUME_CONTROL,
		component: MetricsExplorer,
		key: 'METRICS_EXPLORER_VOLUME_CONTROL',
		isPrivate: true,
	},

	{
		path: ROUTES.METER,
		component: MeterExplorerPage,
		key: 'METER',
		isPrivate: true,
	},
	{
		path: ROUTES.METER_EXPLORER,
		component: MeterExplorerPage,
		key: 'METER_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.METER_EXPLORER_VIEWS,
		component: MeterExplorerPage,
		key: 'METER_EXPLORER_VIEWS',
		isPrivate: true,
	},
	{
		path: ROUTES.API_MONITORING,
		component: ApiMonitoring,
		key: 'API_MONITORING',
		isPrivate: true,
	},
	{
		path: [ROUTES.AI_ASSISTANT_BASE, ROUTES.AI_ASSISTANT],
		component: AIAssistantPage,
		key: 'AI_ASSISTANT',
		isPrivate: true,
	},
	{
		path: ROUTES.AI_OBSERVABILITY_ATTRIBUTE_MAPPING,
		component: LLMObservabilityPage,
		key: 'AI_OBSERVABILITY_ATTRIBUTE_MAPPING',
		isPrivate: true,
	},
	{
		path: ROUTES.AI_OBSERVABILITY_OVERVIEW,
		component: LLMObservabilityPage,
		key: 'AI_OBSERVABILITY_OVERVIEW',
		isPrivate: true,
	},
	{
		path: ROUTES.AI_OBSERVABILITY_EXPLORER,
		component: LLMObservabilityPage,
		key: 'AI_OBSERVABILITY_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.AI_OBSERVABILITY_CONFIGURATION,
		component: LLMObservabilityPage,
		key: 'AI_OBSERVABILITY_CONFIGURATION',
		isPrivate: true,
	},
];

export const SUPPORT_ROUTE: AppRoutes = {
	path: ROUTES.SUPPORT,
	component: SupportPage,
	key: 'SUPPORT',
	isPrivate: true,
};

export const LIST_LICENSES: AppRoutes = {
	path: ROUTES.LIST_LICENSES,
	component: LicensePage,
	isPrivate: true,
	key: 'LIST_LICENSES',
};

export const oldNewRoutesMapping: Record<string, string> = {
	'/pipelines': '/logs/pipelines',
	'/logs-explorer': '/logs/logs-explorer',
	'/logs-explorer/live': '/logs/logs-explorer/live',
	'/logs-save-views': '/logs/saved-views',
	'/traces-save-views': '/traces/saved-views',
	'/settings/access-tokens': '/settings/service-accounts',
	'/settings/api-keys': '/settings/service-accounts',
	'/messaging-queues': '/messaging-queues/overview',
	'/alerts/edit': '/alerts/overview',
	'/alerts/type-selection': '/alerts/new',
	// TODO(H4ad): Update this after https://github.com/SigNoz/engineering-pod/issues/5322
	'/settings/channels': '/alerts?tab=Channels',
	'/settings/channels/new': '/alerts/channels/new',
};
export const oldRoutes = Object.keys(oldNewRoutesMapping);

export const ROUTES_NOT_TO_BE_OVERRIDEN: string[] = [
	ROUTES.WORKSPACE_LOCKED,
	ROUTES.WORKSPACE_SUSPENDED,
];

export interface AppRoutes {
	component: ComponentType;
	/** An array registers the same component under each pattern. */
	path: string | string[];
	/**
	 * The route renders its own child routes, so it matches as a prefix. v6
	 * matches the whole path by default, so the mount appends a `/*` splat for
	 * these and nothing for the rest.
	 */
	nested?: boolean;
	isPrivate: boolean;
	key: keyof typeof ROUTES;
}

export default routes;
