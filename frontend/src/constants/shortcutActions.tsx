import ROUTES from 'constants/routes';
import { THEME_MODE } from 'hooks/useDarkMode/constant';
import {
	BarChart2,
	BellDot,
	BugIcon,
	DraftingCompass,
	Expand,
	HardDrive,
	Home,
	LayoutGrid,
	ListMinus,
	ScrollText,
	Settings,
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
			shortcut: ['shift + h'],
			keywords: 'home',
			section: 'Navigation',
			icon: <Home size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.HOME),
		},
		{
			id: 'dashboards',
			name: 'Go to Dashboards',
			shortcut: ['shift + d'],
			keywords: 'dashboards',
			section: 'Navigation',
			icon: <LayoutGrid size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.ALL_DASHBOARD),
		},
		{
			id: 'services',
			name: 'Go to Services',
			shortcut: ['shift + s'],
			keywords: 'services monitoring',
			section: 'Navigation',
			icon: <HardDrive size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.APPLICATION),
		},
		{
			id: 'logs',
			name: 'Go to Logs',
			shortcut: ['shift + l'],
			keywords: 'logs',
			section: 'Navigation',
			icon: <ScrollText size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.LOGS),
		},
		{
			id: 'alerts',
			name: 'Go to Alerts',
			shortcut: ['shift + a'],
			keywords: 'alerts',
			section: 'Navigation',
			icon: <BellDot size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.LIST_ALL_ALERT),
		},
		{
			id: 'exceptions',
			name: 'Go to Exceptions',
			shortcut: ['shift + e'],
			keywords: 'exceptions errors',
			section: 'Navigation',
			icon: <BugIcon size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.ALL_ERROR),
		},
		{
			id: 'messaging-queues',
			name: 'Go to Messaging Queues',
			shortcut: ['shift + q'],
			keywords: 'messaging queues mq',
			section: 'Navigation',
			icon: <ListMinus size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.MESSAGING_QUEUES_OVERVIEW),
		},

		// metrics
		{
			id: 'metrics-summary',
			name: 'Go to Metrics Summary',
			shortcut: ['shift + m'],
			keywords: 'metrics summary',
			section: 'Metrics',
			icon: <BarChart2 size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.METRICS_EXPLORER),
		},
		{
			id: 'metrics-explorer',
			name: 'Go to Metrics Explorer',
			shortcut: ['shift + m + e'],
			keywords: 'metrics explorer',
			section: 'Metrics',
			icon: <BarChart2 size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.METRICS_EXPLORER_EXPLORER),
		},
		{
			id: 'metrics-views',
			name: 'Go to Metrics Views',
			shortcut: ['shift + m + v'],
			keywords: 'metrics views',
			section: 'Metrics',
			icon: <BarChart2 size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.METRICS_EXPLORER_VIEWS),
		},

		// Traces
		{
			id: 'traces',
			name: 'Go to Traces',
			shortcut: ['shift + t'],
			keywords: 'traces',
			section: 'Traces',
			icon: <DraftingCompass size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.TRACES_EXPLORER),
		},
		{
			id: 'traces-funnel',
			name: 'Go to Traces Funnels',
			shortcut: ['shift + t + f'],
			keywords: 'traces funnel',
			section: 'Traces',
			icon: <DraftingCompass size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.TRACES_FUNNELS),
		},

		// Common actions
		{
			id: 'dark-mode',
			name: 'Switch to Dark Mode',
			keywords: 'theme dark mode appearance',
			section: 'Common',
			icon: <Expand size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => handleThemeChange(THEME_MODE.DARK),
		},
		{
			id: 'light-mode',
			name: 'Switch to Light Mode [Beta]',
			keywords: 'theme light mode appearance',
			section: 'Common',
			icon: <Expand size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => handleThemeChange(THEME_MODE.LIGHT),
		},
		{
			id: 'system-theme',
			name: 'Switch to System Theme',
			keywords: 'system theme appearance',
			section: 'Common',
			icon: <Expand size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => handleThemeChange(THEME_MODE.SYSTEM),
		},

		// settings sub-pages
		{
			id: 'my-settings',
			name: 'Go to Account Settings',
			shortcut: ['shift + g'],
			keywords: 'account settings',
			section: 'Settings',
			icon: <Settings size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.MY_SETTINGS),
		},
		{
			id: 'my-settings-ingestion',
			name: 'Go to Account Settings Ingestion',
			shortcut: ['shift + g + i'],
			keywords: 'account settings',
			section: 'Settings',
			icon: <Settings size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.INGESTION_SETTINGS),
		},

		{
			id: 'my-settings-billing',
			name: 'Go to Account Settings Billing',
			shortcut: ['shift + g + b'],
			keywords: 'account settings billing',
			section: 'Settings',
			icon: <Settings size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.BILLING),
		},
		{
			id: 'my-settings-api-keys',
			name: 'Go to Account Settings API Keys',
			shortcut: ['shift + g + k'],
			keywords: 'account settings api keys',
			section: 'Settings',
			icon: <Settings size={14} />,
			roles: ['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER'],
			perform: (): void => navigate(ROUTES.API_KEYS),
		},
	];
}
