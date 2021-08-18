import Loadable from "./components/Loadable";

export const ServiceMetricsPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServiceMetricsPage" */ "Src/modules/Metrics/ServiceMetricsDef"
		),
);

export const ServiceMapPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServiceMapPage" */ "Src/modules/Servicemap/ServiceMap"
		),
);

export const TraceDetailPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "TraceDetailPage" */ "Src/modules/Traces/TraceDetail"
		),
);

export const TraceGraphPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "TraceGraphPage" */ "Src/modules/Traces/TraceGraphDef"
		),
);

export const UsageExplorerPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "UsageExplorerPage" */ "Src/modules/Usage/UsageExplorerDef"
		),
);

export const ServicesTablePage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServicesTablePage" */ "Src/modules/Metrics/ServicesTableDef"
		),
);

export const SignupPage = Loadable(
	() => import(/* webpackChunkName: "SignupPage" */ "Src/modules/Auth/Signup"),
);

export const SettingsPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "SettingsPage" */ "Src/modules/Settings/settingsPage"
		),
);

export const InstrumentationPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "InstrumentationPage" */ "Src/modules/add-instrumentation/instrumentationPage"
		),
);
