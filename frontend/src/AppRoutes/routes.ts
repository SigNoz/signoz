import Loadable from 'components/Loadable';
import ROUTES from 'constants/routes';
import {
	InstrumentationPage,
	ServiceMapPage,
	ServiceMetricsPage,
	ServicesTablePage,
	SettingsPage,
	SignupPage,
	TraceDetailPage,
	TraceGraphPage,
	UsageExplorerPage,
} from 'pages';
import { RouteProps } from 'react-router-dom';

const DashboardPage = Loadable(
	() => import(/* webpackChunkName: "DashboardPage" */ 'pages/Dashboard'),
);

const NewDashboardPage = Loadable(
	() => import(/* webpackChunkName: "New DashboardPage" */ 'pages/NewDashboard'),
);

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
		path: ROUTES.NEW_DASHBOARD,
		exact: true,
		component: NewDashboardPage,
	},
];

interface AppRoutes {
	component: RouteProps['component'];
	path: RouteProps['path'];
	exact: RouteProps['exact'];
	isPrivate?: boolean;
}

export default routes;
