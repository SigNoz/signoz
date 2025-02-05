import Loadable from 'components/Loadable';

export const ServicesTablePage = Loadable(
	() => import(/* webpackChunkName: "ServicesTablePage" */ 'pages/Services'),
);

export const ServiceMetricsPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServiceMetricsPage" */ 'pages/MetricsApplication/MetricsApplication'
		),
);

export const ServiceTopLevelOperationsPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServiceMetricsPage" */ 'pages/ServiceTopLevelOperations'
		),
);

export const ServiceMapPage = Loadable(
	() => import(/* webpackChunkName: "ServiceMapPage" */ 'modules/Servicemap'),
);

export const LogsSaveViews = Loadable(
	() => import(/* webpackChunkName: "LogsSaveViews" */ 'pages/LogsModulePage'), // TODO: Add a wrapper so that the same component can be used in traces
);

export const TracesExplorer = Loadable(
	() =>
		import(
			/* webpackChunkName: "Traces Explorer Page" */ 'pages/TracesModulePage'
		),
);

export const TracesSaveViews = Loadable(
	() =>
		import(/* webpackChunkName: "Traces Save Views" */ 'pages/TracesModulePage'),
);

export const TraceFilter = Loadable(
	() => import(/* webpackChunkName: "Trace Filter Page" */ 'pages/Trace'),
);

export const TraceDetail = Loadable(
	() =>
		import(
			/* webpackChunkName: "TraceDetail Page" */ 'pages/TraceDetailV2/index'
		),
);

export const UsageExplorerPage = Loadable(
	() => import(/* webpackChunkName: "UsageExplorerPage" */ 'modules/Usage'),
);

export const SignupPage = Loadable(
	() => import(/* webpackChunkName: "SignupPage" */ 'pages/SignUp'),
);

export const SettingsPage = Loadable(
	() => import(/* webpackChunkName: "SettingsPage" */ 'pages/Settings'),
);

export const GettingStarted = Loadable(
	() => import(/* webpackChunkName: "GettingStarted" */ 'pages/GettingStarted'),
);

export const Onboarding = Loadable(
	() => import(/* webpackChunkName: "Onboarding" */ 'pages/OnboardingPage'),
);

export const OrgOnboarding = Loadable(
	() => import(/* webpackChunkName: "OrgOnboarding" */ 'pages/OrgOnboarding'),
);

export const DashboardPage = Loadable(
	() =>
		import(/* webpackChunkName: "DashboardPage" */ 'pages/DashboardsListPage'),
);

export const NewDashboardPage = Loadable(
	() => import(/* webpackChunkName: "New DashboardPage" */ 'pages/NewDashboard'),
);

export const DashboardWidget = Loadable(
	() =>
		import(/* webpackChunkName: "DashboardWidgetPage" */ 'pages/DashboardWidget'),
);

export const EditRulesPage = Loadable(
	() => import(/* webpackChunkName: "Alerts Edit Page" */ 'pages/EditRules'),
);

export const ListAllALertsPage = Loadable(
	() => import(/* webpackChunkName: "All Alerts Page" */ 'pages/AlertList'),
);

export const CreateNewAlerts = Loadable(
	() => import(/* webpackChunkName: "Create Alerts" */ 'pages/CreateAlert'),
);

export const AlertHistory = Loadable(
	() => import(/* webpackChunkName: "Alert History" */ 'pages/AlertList'),
);

export const AlertOverview = Loadable(
	() => import(/* webpackChunkName: "Alert Overview" */ 'pages/AlertList'),
);

export const CreateAlertChannelAlerts = Loadable(
	() =>
		import(/* webpackChunkName: "Create Channels" */ 'pages/AlertChannelCreate'),
);

export const EditAlertChannelsAlerts = Loadable(
	() => import(/* webpackChunkName: "Edit Channels" */ 'pages/ChannelsEdit'),
);

export const AllAlertChannels = Loadable(
	() => import(/* webpackChunkName: "All Channels" */ 'pages/Settings'),
);

export const AllErrors = Loadable(
	/* webpackChunkName: "All Exceptions" */ () => import('pages/AllErrors'),
);

export const ErrorDetails = Loadable(
	() => import(/* webpackChunkName: "Error Details" */ 'pages/ErrorDetails'),
);

export const StatusPage = Loadable(
	() => import(/* webpackChunkName: "All Status" */ 'pages/Status'),
);

export const OrganizationSettings = Loadable(
	() => import(/* webpackChunkName: "All Settings" */ 'pages/Settings'),
);

export const IngestionSettings = Loadable(
	() => import(/* webpackChunkName: "Ingestion Settings" */ 'pages/Settings'),
);

export const APIKeys = Loadable(
	() => import(/* webpackChunkName: "All Settings" */ 'pages/Settings'),
);

export const MySettings = Loadable(
	() => import(/* webpackChunkName: "All MySettings" */ 'pages/MySettings'),
);

export const CustomDomainSettings = Loadable(
	() =>
		import(/* webpackChunkName: "Custom Domain Settings" */ 'pages/Settings'),
);

export const Logs = Loadable(
	() => import(/* webpackChunkName: "Logs" */ 'pages/LogsModulePage'),
);

export const LogsExplorer = Loadable(
	() => import(/* webpackChunkName: "Logs Explorer" */ 'pages/LogsModulePage'),
);

export const OldLogsExplorer = Loadable(
	() => import(/* webpackChunkName: "Logs Explorer" */ 'pages/Logs'),
);

export const LiveLogs = Loadable(
	() => import(/* webpackChunkName: "Live Logs" */ 'pages/LiveLogs'),
);

export const PipelinePage = Loadable(
	() => import(/* webpackChunkName: "Pipelines" */ 'pages/LogsModulePage'),
);

export const Login = Loadable(
	() => import(/* webpackChunkName: "Login" */ 'pages/Login'),
);

export const UnAuthorized = Loadable(
	() => import(/* webpackChunkName: "UnAuthorized" */ 'pages/UnAuthorized'),
);

export const PasswordReset = Loadable(
	() => import(/* webpackChunkName: "ResetPassword" */ 'pages/ResetPassword'),
);

export const SomethingWentWrong = Loadable(
	() =>
		import(
			/* webpackChunkName: "ErrorBoundaryFallback" */ 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback'
		),
);

export const LicensePage = Loadable(
	() => import(/* webpackChunkName: "All Channels" */ 'pages/License'),
);

export const LogsIndexToFields = Loadable(
	() =>
		import(/* webpackChunkName: "LogsIndexToFields Page" */ 'pages/LogsSettings'),
);

export const BillingPage = Loadable(
	() => import(/* webpackChunkName: "BillingPage" */ 'pages/Billing'),
);

export const SupportPage = Loadable(
	() => import(/* webpackChunkName: "SupportPage" */ 'pages/Support'),
);

export const WorkspaceBlocked = Loadable(
	() =>
		import(/* webpackChunkName: "WorkspaceLocked" */ 'pages/WorkspaceLocked'),
);

export const WorkspaceSuspended = Loadable(
	() =>
		import(
			/* webpackChunkName: "WorkspaceSuspended" */ 'pages/WorkspaceSuspended/WorkspaceSuspended'
		),
);

export const ShortcutsPage = Loadable(
	() => import(/* webpackChunkName: "ShortcutsPage" */ 'pages/Shortcuts'),
);

export const InstalledIntegrations = Loadable(
	() =>
		import(
			/* webpackChunkName: "InstalledIntegrations" */ 'pages/IntegrationsModulePage'
		),
);

export const MessagingQueuesMainPage = Loadable(
	() =>
		import(/* webpackChunkName: "MessagingQueues" */ 'pages/MessagingQueues'),
);

export const MQDetailPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "MQDetailPage" */ 'pages/MessagingQueues/MQDetailPage'
		),
);

export const InfrastructureMonitoring = Loadable(
	() =>
		import(
			/* webpackChunkName: "InfrastructureMonitoring" */ 'pages/InfrastructureMonitoring'
		),
);

export const CeleryTask = Loadable(
	() =>
		import(
			/* webpackChunkName: "CeleryTask" */ 'pages/Celery/CeleryTask/CeleryTask'
		),
);

export const CeleryOverview = Loadable(
	() =>
		import(
			/* webpackChunkName: "CeleryOverview" */ 'pages/Celery/CeleryOverview/CeleryOverview'
		),
);

export const MetricsExplorer = Loadable(
	() =>
		import(/* webpackChunkName: "MetricsExplorer" */ 'pages/MetricsExplorer'),
);
