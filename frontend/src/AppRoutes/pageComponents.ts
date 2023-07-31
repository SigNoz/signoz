import Loadable from 'components/Loadable';

export const ServicesTablePage = Loadable(
	() => import(/* webpackChunkName: "ServicesTablePage" */ 'pages/Services'),
);

export const ServiceMetricsPage = Loadable(
	() =>
		import(
			/* webpackChunkName: "ServiceMetricsPage" */ 'pages/MetricsApplication'
		),
);

export const ServiceMapPage = Loadable(
	() => import(/* webpackChunkName: "ServiceMapPage" */ 'modules/Servicemap'),
);

export const TracesExplorer = Loadable(
	() =>
		import(/* webpackChunkName: "Traces Explorer Page" */ 'pages/TracesExplorer'),
);

export const TraceFilter = Loadable(
	() => import(/* webpackChunkName: "Trace Filter Page" */ 'pages/Trace'),
);

export const TraceDetail = Loadable(
	() => import(/* webpackChunkName: "TraceDetail Page" */ 'pages/TraceDetail'),
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

export const DashboardPage = Loadable(
	() => import(/* webpackChunkName: "DashboardPage" */ 'pages/Dashboard'),
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

export const MySettings = Loadable(
	() => import(/* webpackChunkName: "All MySettings" */ 'pages/MySettings'),
);

export const Logs = Loadable(
	() => import(/* webpackChunkName: "Logs" */ 'pages/Logs'),
);

export const LogsExplorer = Loadable(
	() => import(/* webpackChunkName: "Logs Explorer" */ 'pages/LogsExplorer'),
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
			/* webpackChunkName: "SomethingWentWrong" */ 'pages/SomethingWentWrong'
		),
);

export const LicensePage = Loadable(
	() => import(/* webpackChunkName: "All Channels" */ 'pages/License'),
);
