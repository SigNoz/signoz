import ROUTES from 'constants/routes';
import WorkspaceBlocked from 'pages/WorkspaceLocked';
import { RouteProps } from 'react-router-dom';

import {
	AllAlertChannels,
	AllErrors,
	BillingPage,
	CreateAlertChannelAlerts,
	CreateNewAlerts,
	DashboardPage,
	DashboardWidget,
	EditAlertChannelsAlerts,
	EditRulesPage,
	ErrorDetails,
	IngestionSettings,
	LicensePage,
	ListAllALertsPage,
	LiveLogs,
	Login,
	Logs,
	LogsExplorer,
	LogsIndexToFields,
	MySettings,
	NewDashboardPage,
	Onboarding,
	OrganizationSettings,
	PasswordReset,
	PipelinePage,
	ServiceMapPage,
	ServiceMetricsPage,
	ServicesTablePage,
	SettingsPage,
	SignupPage,
	SomethingWentWrong,
	StatusPage,
	SupportPage,
	TraceDetail,
	TraceFilter,
	TracesExplorer,
	UnAuthorized,
	UsageExplorerPage,
} from './pageComponents';

const routes: AppRoutes[] = [
	{
		component: SignupPage,
		path: ROUTES.SIGN_UP,
		exact: true,
		isPrivate: false,
		key: 'SIGN_UP',
	},
	{
		path: ROUTES.GET_STARTED,
		exact: true,
		component: Onboarding,
		isPrivate: true,
		key: 'GET_STARTED',
	},
	{
		component: LogsIndexToFields,
		path: ROUTES.LOGS_INDEX_FIELDS,
		exact: true,
		isPrivate: true,
		key: 'LOGS_INDEX_FIELDS',
	},
	{
		component: ServicesTablePage,
		path: ROUTES.APPLICATION,
		exact: true,
		isPrivate: true,
		key: 'APPLICATION',
	},
	{
		path: ROUTES.SERVICE_METRICS,
		exact: true,
		component: ServiceMetricsPage,
		isPrivate: true,
		key: 'SERVICE_METRICS',
	},
	{
		path: ROUTES.SERVICE_MAP,
		component: ServiceMapPage,
		isPrivate: true,
		exact: true,
		key: 'SERVICE_MAP',
	},
	{
		path: ROUTES.TRACE_DETAIL,
		exact: true,
		component: TraceDetail,
		isPrivate: true,
		key: 'TRACE_DETAIL',
	},
	{
		path: ROUTES.SETTINGS,
		exact: true,
		component: SettingsPage,
		isPrivate: true,
		key: 'SETTINGS',
	},
	{
		path: ROUTES.USAGE_EXPLORER,
		exact: true,
		component: UsageExplorerPage,
		isPrivate: true,
		key: 'USAGE_EXPLORER',
	},
	{
		path: ROUTES.ALL_DASHBOARD,
		exact: true,
		component: DashboardPage,
		isPrivate: true,
		key: 'ALL_DASHBOARD',
	},
	{
		path: ROUTES.DASHBOARD,
		exact: true,
		component: NewDashboardPage,
		isPrivate: true,
		key: 'DASHBOARD',
	},
	{
		path: ROUTES.DASHBOARD_WIDGET,
		exact: true,
		component: DashboardWidget,
		isPrivate: true,
		key: 'DASHBOARD_WIDGET',
	},
	{
		path: ROUTES.EDIT_ALERTS,
		exact: true,
		component: EditRulesPage,
		isPrivate: true,
		key: 'EDIT_ALERTS',
	},
	{
		path: ROUTES.LIST_ALL_ALERT,
		exact: true,
		component: ListAllALertsPage,
		isPrivate: true,
		key: 'LIST_ALL_ALERT',
	},
	{
		path: ROUTES.ALERTS_NEW,
		exact: true,
		component: CreateNewAlerts,
		isPrivate: true,
		key: 'ALERTS_NEW',
	},
	{
		path: ROUTES.TRACE,
		exact: true,
		component: TraceFilter,
		isPrivate: true,
		key: 'TRACE',
	},
	{
		path: ROUTES.TRACES_EXPLORER,
		exact: true,
		component: TracesExplorer,
		isPrivate: true,
		key: 'TRACES_EXPLORER',
	},
	{
		path: ROUTES.CHANNELS_NEW,
		exact: true,
		component: CreateAlertChannelAlerts,
		isPrivate: true,
		key: 'CHANNELS_NEW',
	},
	{
		path: ROUTES.CHANNELS_EDIT,
		exact: true,
		component: EditAlertChannelsAlerts,
		isPrivate: true,
		key: 'CHANNELS_EDIT',
	},
	{
		path: ROUTES.ALL_CHANNELS,
		exact: true,
		component: AllAlertChannels,
		isPrivate: true,
		key: 'ALL_CHANNELS',
	},
	{
		path: ROUTES.ALL_ERROR,
		exact: true,
		isPrivate: true,
		component: AllErrors,
		key: 'ALL_ERROR',
	},
	{
		path: ROUTES.LIST_LICENSES,
		exact: true,
		component: LicensePage,
		isPrivate: true,
		key: 'LIST_LICENSES',
	},
	{
		path: ROUTES.ERROR_DETAIL,
		exact: true,
		component: ErrorDetails,
		isPrivate: true,
		key: 'ERROR_DETAIL',
	},
	{
		path: ROUTES.VERSION,
		exact: true,
		component: StatusPage,
		isPrivate: true,
		key: 'VERSION',
	},
	{
		path: ROUTES.ORG_SETTINGS,
		exact: true,
		component: OrganizationSettings,
		isPrivate: true,
		key: 'ORG_SETTINGS',
	},
	{
		path: ROUTES.INGESTION_SETTINGS,
		exact: true,
		component: IngestionSettings,
		isPrivate: true,
		key: 'INGESTION_SETTINGS',
	},
	{
		path: ROUTES.MY_SETTINGS,
		exact: true,
		component: MySettings,
		isPrivate: true,
		key: 'MY_SETTINGS',
	},
	{
		path: ROUTES.LOGS,
		exact: true,
		component: Logs,
		key: 'LOGS',
		isPrivate: true,
	},
	{
		path: ROUTES.LOGS_EXPLORER,
		exact: true,
		component: LogsExplorer,
		key: 'LOGS_EXPLORER',
		isPrivate: true,
	},
	{
		path: ROUTES.LIVE_LOGS,
		exact: true,
		component: LiveLogs,
		key: 'LIVE_LOGS',
		isPrivate: true,
	},
	{
		path: ROUTES.LOGIN,
		exact: true,
		component: Login,
		isPrivate: false,
		key: 'LOGIN',
	},
	{
		path: ROUTES.UN_AUTHORIZED,
		exact: true,
		component: UnAuthorized,
		key: 'UN_AUTHORIZED',
		isPrivate: true,
	},
	{
		path: ROUTES.PASSWORD_RESET,
		exact: true,
		component: PasswordReset,
		key: 'PASSWORD_RESET',
		isPrivate: false,
	},
	{
		path: ROUTES.SOMETHING_WENT_WRONG,
		exact: true,
		component: SomethingWentWrong,
		key: 'SOMETHING_WENT_WRONG',
		isPrivate: false,
	},
	{
		path: ROUTES.PIPELINES,
		exact: true,
		component: PipelinePage,
		key: 'PIPELINES',
		isPrivate: true,
	},
	{
		path: ROUTES.BILLING,
		exact: true,
		component: BillingPage,
		key: 'BILLING',
		isPrivate: true,
	},
	{
		path: ROUTES.WORKSPACE_LOCKED,
		exact: true,
		component: WorkspaceBlocked,
		isPrivate: true,
		key: 'WORKSPACE_LOCKED',
	},
];

export const SUPPORT_ROUTE: AppRoutes = {
	path: ROUTES.SUPPORT,
	exact: true,
	component: SupportPage,
	key: 'SUPPORT',
	isPrivate: true,
};

export interface AppRoutes {
	component: RouteProps['component'];
	path: RouteProps['path'];
	exact: RouteProps['exact'];
	isPrivate: boolean;
	key: keyof typeof ROUTES;
}

export default routes;
