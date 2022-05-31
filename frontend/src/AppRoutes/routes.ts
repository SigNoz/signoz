import ROUTES from 'constants/routes';
import DashboardWidget from 'pages/DashboardWidget';
import { RouteProps } from 'react-router-dom';

import {
	AllAlertChannels,
	AllErrors,
	CreateAlertChannelAlerts,
	CreateNewAlerts,
	DashboardPage,
	EditAlertChannelsAlerts,
	EditRulesPage,
	ErrorDetails,
	InstrumentationPage,
	ListAllALertsPage,
	Login,
	MySettings,
	NewDashboardPage,
	OrganizationSettings,
	PasswordReset,
	ServiceMapPage,
	ServiceMetricsPage,
	ServicesTablePage,
	SettingsPage,
	SignupPage,
	SomethingWentWrong,
	StatusPage,
	TraceDetail,
	TraceFilter,
	UnAuthorized,
	UsageExplorerPage,
} from './pageComponents';

const routes: AppRoutes[] = [
	{
		element: SignupPage,
		path: ROUTES.SIGN_UP,
		caseSensitive: true,
		isPrivate: false,
		key: 'SIGN_UP',
	},
	{
		element: ServicesTablePage,
		path: ROUTES.APPLICATION,
		caseSensitive: true,
		isPrivate: true,
		key: 'APPLICATION',
	},
	{
		path: ROUTES.SERVICE_METRICS,
		caseSensitive: true,
		element: ServiceMetricsPage,
		isPrivate: true,
		key: 'SERVICE_METRICS',
	},
	{
		path: ROUTES.SERVICE_MAP,
		element: ServiceMapPage,
		isPrivate: true,
		caseSensitive: true,
		key: 'SERVICE_MAP',
	},
	{
		path: ROUTES.TRACE_DETAIL,
		caseSensitive: true,
		element: TraceDetail,
		isPrivate: true,
		key: 'TRACE_DETAIL',
	},
	{
		path: ROUTES.SETTINGS,
		caseSensitive: true,
		element: SettingsPage,
		isPrivate: true,
		key: 'SETTINGS',
	},
	{
		path: ROUTES.USAGE_EXPLORER,
		caseSensitive: true,
		element: UsageExplorerPage,
		isPrivate: true,
		key: 'USAGE_EXPLORER',
	},
	{
		path: ROUTES.INSTRUMENTATION,
		caseSensitive: true,
		element: InstrumentationPage,
		isPrivate: true,
		key: 'INSTRUMENTATION',
	},
	{
		path: ROUTES.ALL_DASHBOARD,
		caseSensitive: true,
		element: DashboardPage,
		isPrivate: true,
		key: 'ALL_DASHBOARD',
	},
	{
		path: ROUTES.DASHBOARD,
		caseSensitive: true,
		element: NewDashboardPage,
		isPrivate: true,
		key: 'DASHBOARD',
	},
	{
		path: ROUTES.DASHBOARD_WIDGET,
		caseSensitive: true,
		element: DashboardWidget,
		isPrivate: true,
		key: 'DASHBOARD_WIDGET',
	},
	{
		path: ROUTES.EDIT_ALERTS,
		caseSensitive: true,
		element: EditRulesPage,
		isPrivate: true,
		key: 'EDIT_ALERTS',
	},
	{
		path: ROUTES.LIST_ALL_ALERT,
		caseSensitive: true,
		element: ListAllALertsPage,
		isPrivate: true,
		key: 'LIST_ALL_ALERT',
	},
	{
		path: ROUTES.ALERTS_NEW,
		caseSensitive: true,
		element: CreateNewAlerts,
		isPrivate: true,
		key: 'ALERTS_NEW',
	},
	{
		path: ROUTES.TRACE,
		caseSensitive: true,
		element: TraceFilter,
		isPrivate: true,
		key: 'TRACE',
	},
	{
		path: ROUTES.CHANNELS_NEW,
		caseSensitive: true,
		element: CreateAlertChannelAlerts,
		isPrivate: true,
		key: 'CHANNELS_NEW',
	},
	{
		path: ROUTES.CHANNELS_EDIT,
		caseSensitive: true,
		element: EditAlertChannelsAlerts,
		isPrivate: true,
		key: 'CHANNELS_EDIT',
	},
	{
		path: ROUTES.ALL_CHANNELS,
		caseSensitive: true,
		element: AllAlertChannels,
		isPrivate: true,
		key: 'ALL_CHANNELS',
	},
	{
		path: ROUTES.ALL_ERROR,
		caseSensitive: true,
		isPrivate: true,
		element: AllErrors,
		key: 'ALL_ERROR',
	},
	{
		path: ROUTES.ERROR_DETAIL,
		caseSensitive: true,
		element: ErrorDetails,
		isPrivate: true,
		key: 'ERROR_DETAIL',
	},
	{
		path: ROUTES.VERSION,
		caseSensitive: true,
		element: StatusPage,
		isPrivate: true,
		key: 'VERSION',
	},
	{
		path: ROUTES.ORG_SETTINGS,
		caseSensitive: true,
		element: OrganizationSettings,
		isPrivate: true,
		key: 'ORG_SETTINGS',
	},
	{
		path: ROUTES.MY_SETTINGS,
		caseSensitive: true,
		element: MySettings,
		isPrivate: true,
		key: 'MY_SETTINGS',
	},
	{
		path: ROUTES.LOGIN,
		caseSensitive: true,
		element: Login,
		isPrivate: false,
		key: 'LOGIN',
	},
	{
		path: ROUTES.UN_AUTHORIZED,
		caseSensitive: true,
		element: UnAuthorized,
		key: 'UN_AUTHORIZED',
		isPrivate: true,
	},
	{
		path: ROUTES.PASSWORD_RESET,
		caseSensitive: true,
		element: PasswordReset,
		key: 'PASSWORD_RESET',
		isPrivate: false,
	},
	{
		path: ROUTES.SOMETHING_WENT_WRONG,
		caseSensitive: true,
		element: SomethingWentWrong,
		key: 'SOMETHING_WENT_WRONG',
		isPrivate: false,
	},
];

export interface AppRoutes {
	element: RouteProps['element'];
	path: RouteProps['path'];
	caseSensitive: RouteProps['caseSensitive'];
	isPrivate: boolean;
	key: keyof typeof ROUTES;
}

export default routes;
