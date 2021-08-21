import React from "react";

export const ServiceMetrics = React.lazy(
	() => import("modules/Metrics/ServiceMetricsDef"),
);
export const ServiceMap = React.lazy(
	() => import("modules/Servicemap/ServiceMap"),
);
export const TraceDetail = React.lazy(
	() => import("modules/Traces/TraceDetail"),
);
export const TraceGraph = React.lazy(
	() => import("modules/Traces/TraceGraphDef"),
);
export const UsageExplorer = React.lazy(
	() => import("modules/Usage/UsageExplorerDef"),
);
export const ServicesTable = React.lazy(
	() => import("modules/Metrics/ServicesTableDef"),
);
export const Signup = React.lazy(() => import("modules/Auth/Signup"));
export const SettingsPage = React.lazy(
	() => import("modules/Settings/settingsPage"),
);

export const InstrumentationPage = React.lazy(
	() => import("modules/add-instrumentation/instrumentationPage"),
);
