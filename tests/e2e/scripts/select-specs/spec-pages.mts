/**
 * Route components each folder under `tests/` opens, keyed by the specifier
 * `frontend/src/AppRoutes/pageComponents.ts` lazy-imports them with. A folder
 * runs when a changed frontend file is reachable from one of its pages.
 * `pnpm select-specs --check` fails when a folder or a page key is missing.
 */
export const SPEC_PAGES: Record<string, string[]> = {
	alerts: ['pages/AlertList', 'pages/CreateAlert', 'pages/EditRules'],
	'api-monitoring': ['pages/ApiMonitoring'],
	'app-shell': [
		'pages/HomePage/HomePage',
		'pages/Services',
		'pages/DashboardsListPage',
		'pages/Settings',
		'pages/Login',
	],
	auth: [
		'pages/Login',
		'pages/SignUp',
		'pages/ForgotPassword',
		'pages/ResetPassword',
		'pages/HomePage/HomePage',
		'pages/Settings',
	],
	dashboards: [
		'pages/DashboardsListPage',
		'pages/DashboardPage',
		'pages/DashboardPage/PanelEditorPage/PanelEditorPage',
	],
	exceptions: [
		'pages/AllErrors',
		'pages/ErrorDetails',
		'pages/TraceDetailsV3/index',
	],
	home: ['pages/HomePage/HomePage'],
	'infra-monitoring': ['pages/InfrastructureMonitoring'],
	integrations: [
		'pages/IntegrationsModulePage',
		'pages/IntegrationsDetailsPage',
	],
	'llm-o11y': ['pages/LLMObservability', 'pages/TraceDetailsV3/index'],
	'logs-explorer': ['pages/LogsModulePage', 'pages/LogsSettings'],
	'logs-pipelines': ['pages/LogsModulePage'],
	'messaging-queues': [
		'pages/MessagingQueues',
		'pages/MessagingQueues/MQDetailPage',
		'pages/Celery/CeleryOverview/CeleryOverview',
		'pages/Celery/CeleryTask/CeleryTask',
	],
	meter: ['pages/MeterExplorer'],
	'metrics-explorer': ['pages/MetricsExplorer'],
	onboarding: [
		'pages/OrgOnboarding',
		'pages/OnboardingPageV2',
		'pages/HomePage/HomePage',
	],
	'public-dashboard': ['pages/PublicDashboard', 'pages/DashboardPage'],
	'query-builder': [
		'pages/LogsModulePage',
		'pages/TracesModulePage',
		'pages/MetricsExplorer',
		'pages/DashboardPage',
		'pages/DashboardPage/PanelEditorPage/PanelEditorPage',
		'pages/CreateAlert',
		'pages/EditRules',
	],
	'quick-filters': ['pages/LogsModulePage'],
	routing: [
		'pages/HomePage/HomePage',
		'pages/Services',
		'pages/DashboardsListPage',
		'pages/DashboardPage',
		'pages/AlertList',
		'pages/InfrastructureMonitoring',
		'pages/MetricsExplorer',
		'pages/TracesModulePage',
		'pages/TraceDetailsV3/index',
		'pages/LogsModulePage',
		'pages/Settings',
	],
	'saved-views': [
		'pages/LogsModulePage',
		'pages/TracesModulePage',
		'pages/MetricsExplorer',
		'pages/MeterExplorer',
	],
	'service-map': ['modules/Servicemap', 'pages/Services'],
	services: [
		'pages/Services',
		'pages/MetricsApplication/MetricsApplication',
		'pages/ServiceTopLevelOperations',
	],
	settings: ['pages/Settings'],
	sso: ['pages/Login', 'pages/Settings'],
	'trace-details': ['pages/TraceDetailsV3/index'],
	'traces-explorer': ['pages/TracesModulePage', 'pages/TraceDetailsV3/index'],
	'traces-funnels': ['pages/TracesModulePage', 'pages/TraceDetailsV3/index'],
};

/** Files outside `frontend/` that a folder reads at runtime, by repo-relative prefix. */
export const SPEC_DATA: Record<string, string[]> = {
	'infra-monitoring': ['tests/integration/testdata/inframonitoring/'],
};
