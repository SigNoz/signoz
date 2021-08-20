import {
	ServiceMetricsPage,
	ServiceMapPage,
	TraceDetailPage,
	TraceGraphPage,
	UsageExplorerPage,
	ServicesTablePage,
	SignupPage,
	SettingsPage,
	InstrumentationPage,
} from "pages";
import ROUTES from "constants/routes";
import { RouteProps } from "react-router-dom";

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
];

interface AppRoutes {
	component: RouteProps["component"];
	path: RouteProps["path"];
	exact: RouteProps["exact"];
	isPrivate?: boolean;
}

export default routes;
