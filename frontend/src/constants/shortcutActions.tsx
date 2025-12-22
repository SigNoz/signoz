import ROUTES from 'constants/routes';
import { GlobalShortcutsName } from 'constants/shortcuts/globalShortcuts';
import { THEME_MODE } from 'hooks/useDarkMode/constant';
import {
	BarChart2,
	BellDot,
	BugIcon,
	Compass,
	DraftingCompass,
	Expand,
	HardDrive,
	Home,
	LayoutGrid,
	ListMinus,
	ScrollText,
	Settings,
	TowerControl,
	Workflow,
} from 'lucide-react';
import React from 'react';

export type UserRole = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'VIEWER';

export type CmdAction = {
	id: string;
	name: string;
	shortcut?: string[];
	keywords?: string;
	section?: string;
	icon?: React.ReactNode;
	roles?: UserRole[];
	perform: () => void;
};

type ActionDeps = {
	navigate: (path: string) => void;
	handleThemeChange: (mode: string) => void;
};

export function createShortcutActions(deps: ActionDeps): CmdAction[] {
	const { navigate, handleThemeChange } = deps;

	return [
		{
			id: 'home',
			name: 'Go to Home',
			shortcut: [GlobalShortcutsName.NavigateToHome],
			keywords: 'home',
			section: 'Navigation',
			icon: <Home size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.HOME),
		},
		{
			id: 'dashboards',
			name: 'Go to Dashboards',
			shortcut: [GlobalShortcutsName.NavigateToDashboards],
			keywords: 'dashboards',
			section: 'Navigation',
			icon: <LayoutGrid size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.ALL_DASHBOARD),
		},
		{
			id: 'services',
			name: 'Go to Services',
			shortcut: [GlobalShortcutsName.NavigateToServices],
			keywords: 'services monitoring',
			section: 'Navigation',
			icon: <HardDrive size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.APPLICATION),
		},
		{
			id: 'alerts',
			name: 'Go to Alerts',
			shortcut: [GlobalShortcutsName.NavigateToAlerts],
			keywords: 'alerts',
			section: 'Navigation',
			icon: <BellDot size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.LIST_ALL_ALERT),
		},
		{
			id: 'exceptions',
			name: 'Go to Exceptions',
			shortcut: [GlobalShortcutsName.NavigateToExceptions],
			keywords: 'exceptions errors',
			section: 'Navigation',
			icon: <BugIcon size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.ALL_ERROR),
		},
		{
			id: 'messaging-queues',
			name: 'Go to Messaging Queues',
			shortcut: [GlobalShortcutsName.NavigateToMessagingQueues],
			keywords: 'messaging queues mq',
			section: 'Navigation',
			icon: <ListMinus size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.MESSAGING_QUEUES_OVERVIEW),
		},

		// logs
		{
			id: 'logs',
			name: 'Go to Logs',
			shortcut: [GlobalShortcutsName.NavigateToLogs],
			keywords: 'logs',
			section: 'Logs',
			icon: <ScrollText size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.LOGS),
		},
		{
			id: 'logs',
			name: 'Go to Logs Pipelines',
			shortcut: [GlobalShortcutsName.NavigateToLogsPipelines],
			keywords: 'logs pipelines',
			section: 'Logs',
			icon: <Workflow size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.LOGS_PIPELINES),
		},
		{
			id: 'logs',
			name: 'Go to Logs Views',
			shortcut: [GlobalShortcutsName.NavigateToLogsViews],
			keywords: 'logs views',
			section: 'Logs',
			icon: <TowerControl size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.LOGS_SAVE_VIEWS),
		},

		// metrics
		{
			id: 'metrics-summary',
			name: 'Go to Metrics Summary',
			shortcut: [GlobalShortcutsName.NavigateToMetricsSummary],
			keywords: 'metrics summary',
			section: 'Metrics',
			icon: <BarChart2 size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.METRICS_EXPLORER),
		},
		{
			id: 'metrics-explorer',
			name: 'Go to Metrics Explorer',
			shortcut: [GlobalShortcutsName.NavigateToMetricsExplorer],
			keywords: 'metrics explorer',
			section: 'Metrics',
			icon: <Compass size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.METRICS_EXPLORER_EXPLORER),
		},
		{
			id: 'metrics-views',
			name: 'Go to Metrics Views',
			shortcut: [GlobalShortcutsName.NavigateToMetricsViews],
			keywords: 'metrics views',
			section: 'Metrics',
			icon: <TowerControl size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.METRICS_EXPLORER_VIEWS),
		},

		// Traces
		{
			id: 'traces',
			name: 'Go to Traces',
			shortcut: [GlobalShortcutsName.NavigateToTraces],
			keywords: 'traces',
			section: 'Traces',
			icon: <DraftingCompass size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.TRACES_EXPLORER),
		},
		{
			id: 'traces-funnel',
			name: 'Go to Traces Funnels',
			shortcut: [GlobalShortcutsName.NavigateToTracesFunnel],
			keywords: 'traces funnel',
			section: 'Traces',
			icon: <DraftingCompass size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.TRACES_FUNNELS),
		},

		// Common actions
		{
			id: 'dark-mode',
			name: 'Switch to Dark Mode',
			keywords: 'theme dark mode appearance',
			section: 'Common',
			icon: <Expand size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => handleThemeChange(THEME_MODE.DARK),
		},
		{
			id: 'light-mode',
			name: 'Switch to Light Mode [Beta]',
			keywords: 'theme light mode appearance',
			section: 'Common',
			icon: <Expand size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => handleThemeChange(THEME_MODE.LIGHT),
		},
		{
			id: 'system-theme',
			name: 'Switch to System Theme',
			keywords: 'system theme appearance',
			section: 'Common',
			icon: <Expand size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => handleThemeChange(THEME_MODE.SYSTEM),
		},

		// settings sub-pages
		{
			id: 'my-settings',
			name: 'Go to Account Settings',
			shortcut: [GlobalShortcutsName.NavigateToSettings],
			keywords: 'account settings',
			section: 'Settings',
			icon: <Settings size={14} />,
			roles: ['ADMIN', 'EDITOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.MY_SETTINGS),
		},
		{
			id: 'my-settings-ingestion',
			name: 'Go to Account Settings Ingestion',
			shortcut: [GlobalShortcutsName.NavigateToSettingsIngestion],
			keywords: 'account settings',
			section: 'Settings',
			icon: <Settings size={14} />,
			roles: ['ADMIN', 'EDITOR'],
			perform: (): void => navigate(ROUTES.INGESTION_SETTINGS),
		},

		{
			id: 'my-settings-billing',
			name: 'Go to Account Settings Billing',
			shortcut: [GlobalShortcutsName.NavigateToSettingsBilling],
			keywords: 'account settings billing',
			section: 'Settings',
			icon: <Settings size={14} />,
			roles: ['ADMIN', 'EDITOR'],
			perform: (): void => navigate(ROUTES.BILLING),
		},
		{
			id: 'my-settings-api-keys',
			name: 'Go to Account Settings API Keys',
			shortcut: [GlobalShortcutsName.NavigateToSettingsAPIKeys],
			keywords: 'account settings api keys',
			section: 'Settings',
			icon: <Settings size={14} />,
			roles: ['ADMIN', 'EDITOR'],
			perform: (): void => navigate(ROUTES.API_KEYS),
		},
	];
}
