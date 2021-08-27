import Loadable from './components/Loadable';

export const ServiceMetricsPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServiceMetricsPage" */ 'modules/Metrics/ServiceMetricsDef'
		),
);

export const ServiceMapPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServiceMapPage" */ 'modules/Servicemap/ServiceMap'
		),
);

export const TraceDetailPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "TraceDetailPage" */ 'modules/Traces/TraceDetail'
		),
);

export const TraceGraphPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "TraceGraphPage" */ 'modules/Traces/TraceGraphDef'
		),
);

export const UsageExplorerPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "UsageExplorerPage" */ 'modules/Usage/UsageExplorerDef'
		),
);

export const ServicesTablePage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServicesTablePage" */ 'modules/Metrics/ServicesTableDef'
		),
);

export const SignupPage = Loadable(
	() => import(/* webpackChunkName: "SignupPage" */ 'modules/Auth/Signup'),
);

export const SettingsPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "SettingsPage" */ 'modules/Settings/settingsPage'
		),
);

export const InstrumentationPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "InstrumentationPage" */ 'modules/add-instrumentation/instrumentationPage'
		),
);
