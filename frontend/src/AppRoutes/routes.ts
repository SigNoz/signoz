import ROUTES from 'constants/routes';
import DashboardWidget from 'pages/DashboardWidget';
import { RouteProps } from 'react-router-dom';
import { ROLES } from 'types/roles';

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
	ServiceMapPage,
	ServiceMetricsPage,
	ServicesTablePage,
	SettingsPage,
	SignupPage,
	StatusPage,
	TraceDetail,
	TraceFilter,
	UnAuthorized,
	UsageExplorerPage,
} from './pageComponents';

const routes: AppRoutes[] = [
	{
		component: SignupPage,
		path: ROUTES.SIGN_UP,
		exact: true,
		isPrivate: false,
	},
	{
		component: ServicesTablePage,
		path: ROUTES.APPLICATION,
		exact: true,
		isPrivate: true,
		permission: ['ADMIN', 'EDITOR', 'VIEWER'],
	},
	{
		path: ROUTES.SERVICE_METRICS,
		exact: true,
		component: ServiceMetricsPage,
		isPrivate: true,
	},
	{
		path: ROUTES.SERVICE_MAP,
		component: ServiceMapPage,
		isPrivate: true,

		exact: true,
	},
	{
		path: ROUTES.TRACE_DETAIL,
		exact: true,
		component: TraceDetail,
		isPrivate: true,
	},
	{
		path: ROUTES.SETTINGS,
		exact: true,
		component: SettingsPage,
		isPrivate: true,
	},
	{
		path: ROUTES.USAGE_EXPLORER,
		exact: true,
		component: UsageExplorerPage,
		isPrivate: true,
	},
	{
		path: ROUTES.INSTRUMENTATION,
		exact: true,
		component: InstrumentationPage,
		isPrivate: true,
	},
	{
		path: ROUTES.ALL_DASHBOARD,
		exact: true,
		component: DashboardPage,
		isPrivate: true,
	},
	{
		path: ROUTES.DASHBOARD,
		exact: true,
		component: NewDashboardPage,
		isPrivate: true,
	},
	{
		path: ROUTES.DASHBOARD_WIDGET,
		exact: true,
		component: DashboardWidget,
		isPrivate: true,
	},
	{
		path: ROUTES.EDIT_ALERTS,
		exact: true,
		component: EditRulesPage,
		isPrivate: true,
	},
	{
		path: ROUTES.LIST_ALL_ALERT,
		exact: true,
		component: ListAllALertsPage,
		isPrivate: true,
	},
	{
		path: ROUTES.ALERTS_NEW,
		exact: true,
		component: CreateNewAlerts,
		isPrivate: true,
	},
	{
		path: ROUTES.TRACE,
		exact: true,
		component: TraceFilter,
		isPrivate: true,
	},
	{
		path: ROUTES.CHANNELS_NEW,
		exact: true,
		component: CreateAlertChannelAlerts,
		isPrivate: true,
	},
	{
		path: ROUTES.CHANNELS_EDIT,
		exact: true,
		component: EditAlertChannelsAlerts,
		isPrivate: true,
	},
	{
		path: ROUTES.ALL_CHANNELS,
		exact: true,
		component: AllAlertChannels,
		isPrivate: true,
	},
	{
		path: ROUTES.ALL_ERROR,
		exact: true,
		isPrivate: true,
		component: AllErrors,
	},
	{
		path: ROUTES.ERROR_DETAIL,
		exact: true,
		component: ErrorDetails,
		isPrivate: true,
	},
	{
		path: ROUTES.VERSION,
		exact: true,
		component: StatusPage,
		isPrivate: true,
	},
	{
		path: ROUTES.ORG_SETTINGS,
		exact: true,
		component: OrganizationSettings,
		isPrivate: true,
	},
	{
		path: ROUTES.MY_SETTINGS,
		exact: true,
		component: MySettings,
		isPrivate: true,
	},
	{
		path: ROUTES.LOGIN,
		exact: true,
		component: Login,
	},
	{
		path: ROUTES.UN_AUTHORIZED,
		exact: true,
		component: UnAuthorized,
	},
];

export interface AppRoutes {
	component: RouteProps['component'];
	path: RouteProps['path'];
	exact: RouteProps['exact'];
	isPrivate?: boolean;
	permission?: ROLES[];
	redirectIfNotLoggedIn?: boolean;
}

export default routes;
