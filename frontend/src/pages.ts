import React from 'react';

export const ServiceMetrics = React.lazy(
	() => import('Src/modules/Metrics/ServiceMetricsDef'),
);
export const ServiceMap = React.lazy(
	() => import('Src/modules/Servicemap/ServiceMap'),
);
export const TraceDetail = React.lazy(
	() => import('Src/modules/Traces/TraceDetail'),
);
export const TraceGraph = React.lazy(
	() => import('Src/modules/Traces/TraceGraphDef'),
);
export const UsageExplorer = React.lazy(
	() => import('Src/modules/Usage/UsageExplorerDef'),
);
export const ServicesTable = React.lazy(
	() => import('Src/modules/Metrics/ServicesTableDef'),
);
export const Signup = React.lazy(() => import('Src/modules/Auth/Signup'));
export const SettingsPage = React.lazy(
	() => import('Src/modules/Settings/settingsPage'),
);

export const IntstrumentationPage = React.lazy(
	() => import('Src/modules/add-instrumentation/instrumentationPage'),
);
