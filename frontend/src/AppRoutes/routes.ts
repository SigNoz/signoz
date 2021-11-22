import ROUTES from 'constants/routes';
import DashboardWidget from 'pages/DashboardWidget';
import { RouteProps } from 'react-router-dom';

import {
	AllAlertChannels,
	CreateAlertChannelAlerts,
	CreateNewAlerts,
	DashboardPage,
	EditAlertChannelsAlerts,
	EditRulesPage,
	InstrumentationPage,
	ListAllALertsPage,
	NewDashboardPage,
	ServiceMapPage,
	ServiceMetricsPage,
	ServicesTablePage,
	SettingsPage,
	SignupPage,
	TraceDetailPage,
	TraceDetailPages,
	TraceGraphPage,
	UsageExplorerPage,
} from './pageComponents';

const routes: AppRoutes[] = [
	{
		component: SignupPage,
		path: ROUTES.SIGN_UP,
		exact: true,
	},
	{
		component: ServicesTablePage,
		path: ROUTES.APPLICATION,
		exact: true,
	},
	{
		path: ROUTES.SERVICE_METRICS,
		exact: true,
		component: ServiceMetricsPage,
	},
	{
		path: ROUTES.SERVICE_MAP,
		component: ServiceMapPage,
		exact: true,
	},
	{
		path: ROUTES.TRACE_GRAPH,
		exact: true,
		component: TraceGraphPage,
	},
	{
		path: ROUTES.SETTINGS,
		exact: true,
		component: SettingsPage,
	},
	{
		path: ROUTES.USAGE_EXPLORER,
		exact: true,
		component: UsageExplorerPage,
	},
	{
		path: ROUTES.INSTRUMENTATION,
		exact: true,
		component: InstrumentationPage,
	},
	{
		path: ROUTES.TRACES,
		exact: true,
		component: TraceDetailPage,
	},
	{
		path: ROUTES.ALL_DASHBOARD,
		exact: true,
		component: DashboardPage,
	},
	{
		path: ROUTES.DASHBOARD,
		exact: true,
		component: NewDashboardPage,
	},
	{
		path: ROUTES.DASHBOARD_WIDGET,
		exact: true,
		component: DashboardWidget,
	},
	{
		path: ROUTES.EDIT_ALERTS,
		exact: true,
		component: EditRulesPage,
	},
	{
		path: ROUTES.LIST_ALL_ALERT,
		exact: true,
		component: ListAllALertsPage,
	},
	{
		path: ROUTES.ALERTS_NEW,
		exact: true,
		component: CreateNewAlerts,
	},
	{
		path: ROUTES.TRACE,
		exact: true,
		component: TraceDetailPages,
	},
	{
		path: ROUTES.CHANNELS_NEW,
		exact: true,
		component: CreateAlertChannelAlerts,
	},
	{
		path: ROUTES.CHANNELS_EDIT,
		exact: true,
		component: EditAlertChannelsAlerts,
	},
	{
		path: ROUTES.ALL_CHANNELS,
		exact: true,
		component: AllAlertChannels,
	},
];

interface AppRoutes {
	component: RouteProps['component'];
	path: RouteProps['path'];
	exact: RouteProps['exact'];
	isPrivate?: boolean;
}

export default routes;
