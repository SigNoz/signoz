import { RocketOutlined } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import {
	ArrowUpRight,
	BarChart2,
	BellDot,
	Binoculars,
	Book,
	Boxes,
	BugIcon,
	ChartArea,
	Cloudy,
	DraftingCompass,
	FileKey2,
	Github,
	Globe,
	HardDrive,
	Home,
	Key,
	Keyboard,
	Layers2,
	LayoutGrid,
	ListMinus,
	MessageSquareText,
	Plus,
	Receipt,
	Route,
	ScrollText,
	Settings,
	Slack,
	Unplug,
	User,
	UserPlus,
} from 'lucide-react';

import { SecondaryMenuItemKey, SidebarItem } from './sideNav.types';

export const getStartedMenuItem = {
	key: ROUTES.GET_STARTED,
	label: 'Get Started',
	icon: <RocketOutlined rotate={45} />,
};

export const getStartedV3MenuItem = {
	key: ROUTES.GET_STARTED_WITH_CLOUD,
	label: 'Get Started',
	icon: <RocketOutlined rotate={45} />,
};

export const homeMenuItem = {
	key: ROUTES.HOME,
	label: 'Home',
	icon: <Home size={16} />,
};

export const inviteMemberMenuItem = {
	key: `${ROUTES.ORG_SETTINGS}#invite-team-members`,
	label: 'Invite Team Member',
	icon: <UserPlus size={16} />,
};

export const manageLicenseMenuItem = {
	key: ROUTES.LIST_LICENSES,
	label: 'Manage Licenses',
	icon: <FileKey2 size={16} />,
};

export const helpSupportMenuItem = {
	key: ROUTES.SUPPORT,
	label: 'Help & Support',
	icon: <MessageSquareText size={16} />,
};

export const shortcutMenuItem = {
	key: ROUTES.SHORTCUTS,
	// eslint-disable-next-line sonarjs/no-duplicate-string
	label: 'Keyboard Shortcuts',
	icon: <Layers2 size={16} />,
};

export const slackSupportMenuItem = {
	key: SecondaryMenuItemKey.Slack,
	label: 'Slack Support',
	icon: <Slack size={16} />,
};

export const trySignozCloudMenuItem: SidebarItem = {
	key: 'trySignozCloud',
	label: 'Try Signoz Cloud',
	icon: <Cloudy size={16} />,
};

const menuItems: SidebarItem[] = [
	{
		key: ROUTES.HOME,
		label: 'Home',
		icon: <Home size={16} />,
		itemKey: 'home',
	},
	{
		key: ROUTES.APPLICATION,
		label: 'Services',
		icon: <HardDrive size={16} />,
		itemKey: 'services',
	},

	{
		key: ROUTES.LOGS,
		label: 'Logs',
		icon: <ScrollText size={16} />,
		itemKey: 'logs',
	},
	{
		key: ROUTES.METRICS_EXPLORER,
		label: 'Metrics',
		icon: <BarChart2 size={16} />,
		isNew: false,
		itemKey: 'metrics',
	},
	{
		key: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
		label: 'Infra Monitoring',
		icon: <Boxes size={16} />,
		itemKey: 'infrastructure',
	},
	{
		key: ROUTES.ALL_DASHBOARD,
		label: 'Dashboards',
		icon: <LayoutGrid size={16} />,
		itemKey: 'dashboards',
	},
	{
		key: ROUTES.MESSAGING_QUEUES_OVERVIEW,
		label: 'Messaging Queues',
		icon: <ListMinus size={16} />,
		itemKey: 'messaging-queues',
	},
	{
		key: ROUTES.API_MONITORING,
		label: 'External APIs',
		icon: <Binoculars size={16} />,
		isNew: true,
		itemKey: 'external-apis',
	},
	{
		key: ROUTES.LIST_ALL_ALERT,
		label: 'Alerts',
		icon: <BellDot size={16} />,
		itemKey: 'alerts',
	},
	{
		key: ROUTES.INTEGRATIONS,
		label: 'Integrations',
		icon: <Unplug size={16} />,
		itemKey: 'integrations',
	},
	{
		key: ROUTES.ALL_ERROR,
		label: 'Exceptions',
		icon: <BugIcon size={16} />,
		itemKey: 'exceptions',
	},
	{
		key: ROUTES.SERVICE_MAP,
		label: 'Service Map',
		icon: <Route size={16} />,
		isBeta: true,
		itemKey: 'service-map',
	},
	{
		key: ROUTES.BILLING,
		label: 'Billing',
		icon: <Receipt size={16} />,
		itemKey: 'billing',
	},
	{
		key: ROUTES.SETTINGS,
		label: 'Settings',
		icon: <Settings size={16} />,
		itemKey: 'settings',
	},
];

export const primaryMenuItems: SidebarItem[] = [
	{
		key: ROUTES.HOME,
		label: 'Home',
		icon: <Home size={16} />,
		itemKey: 'home',
	},
	{
		key: ROUTES.LIST_ALL_ALERT,
		label: 'Alerts',
		icon: <BellDot size={16} />,
		itemKey: 'alerts',
	},
	{
		key: ROUTES.ALL_DASHBOARD,
		label: 'Dashboards',
		icon: <LayoutGrid size={16} />,
		itemKey: 'dashboards',
	},
];

export const defaultMoreMenuItems: SidebarItem[] = [
	{
		key: ROUTES.APPLICATION,
		label: 'Services',
		icon: <HardDrive size={16} />,
		isPinned: true,
		isEnabled: true,
		itemKey: 'services',
	},
	{
		key: ROUTES.LOGS,
		label: 'Logs',
		icon: <ScrollText size={16} />,
		isPinned: true,
		isEnabled: true,
		itemKey: 'logs',
	},
	{
		key: ROUTES.TRACES_EXPLORER,
		label: 'Traces',
		icon: <DraftingCompass size={16} />,
		isPinned: true,
		isEnabled: true,
		itemKey: 'traces',
	},
	{
		key: ROUTES.METRICS_EXPLORER,
		label: 'Metrics',
		icon: <BarChart2 size={16} />,
		isNew: false,
		isEnabled: true,
		itemKey: 'metrics',
	},
	{
		key: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
		label: 'Infrastructure',
		icon: <Boxes size={16} />,
		isPinned: true,
		isEnabled: true,
		itemKey: 'infrastructure',
	},
	{
		key: ROUTES.INTEGRATIONS,
		label: 'Integrations',
		icon: <Unplug size={16} />,
		isEnabled: true,
		itemKey: 'integrations',
	},
	{
		key: ROUTES.ALL_ERROR,
		label: 'Exceptions',
		icon: <BugIcon size={16} />,
		isEnabled: true,
		itemKey: 'exceptions',
	},
	{
		key: ROUTES.API_MONITORING,
		label: 'External APIs',
		icon: <Binoculars size={16} />,
		isNew: true,
		isEnabled: true,
		itemKey: 'external-apis',
	},
	{
		key: ROUTES.METER,
		label: 'Cost Meter',
		icon: <ChartArea size={16} />,
		isNew: false,
		isEnabled: true,
		isBeta: false,
		itemKey: 'meter-explorer',
	},
	{
		key: ROUTES.MESSAGING_QUEUES_OVERVIEW,
		label: 'Messaging Queues',
		icon: <ListMinus size={16} />,
		isEnabled: true,
		itemKey: 'messaging-queues',
	},
	{
		key: ROUTES.SERVICE_MAP,
		label: 'Service Map',
		icon: <Route size={16} />,
		isEnabled: true,
		itemKey: 'service-map',
	},
];

export const settingsMenuItems: SidebarItem[] = [
	{
		key: ROUTES.SETTINGS,
		label: 'General',
		icon: <Settings size={16} />,
		isEnabled: true,
		itemKey: 'general',
	},
	{
		key: ROUTES.BILLING,
		label: 'Billing',
		icon: <Receipt size={16} />,
		isEnabled: false,
		itemKey: 'billing',
	},
	{
		key: ROUTES.ORG_SETTINGS,
		label: 'Members & SSO',
		icon: <User size={16} />,
		isEnabled: false,
		itemKey: 'members-sso',
	},
	{
		key: ROUTES.CUSTOM_DOMAIN_SETTINGS,
		label: 'Custom Domain',
		icon: <Globe size={16} />,
		isEnabled: false,
		itemKey: 'custom-domain',
	},
	{
		key: ROUTES.INTEGRATIONS,
		label: 'Integrations',
		icon: <Unplug size={16} />,
		isEnabled: false,
		itemKey: 'integrations',
	},
	{
		key: ROUTES.ALL_CHANNELS,
		label: 'Notification Channels',
		icon: <FileKey2 size={16} />,
		isEnabled: true,
		itemKey: 'notification-channels',
	},
	{
		key: ROUTES.API_KEYS,
		label: 'API Keys',
		icon: <Key size={16} />,
		isEnabled: false,
		itemKey: 'api-keys',
	},
	{
		key: ROUTES.INGESTION_SETTINGS,
		label: 'Ingestion',
		icon: <RocketOutlined rotate={45} />,
		isEnabled: false,
		itemKey: 'ingestion',
	},
	{
		key: ROUTES.MY_SETTINGS,
		label: 'Account Settings',
		icon: <User size={16} />,
		isEnabled: true,
		itemKey: 'account-settings',
	},
	{
		key: ROUTES.SHORTCUTS,
		label: 'Keyboard Shortcuts',
		icon: <Layers2 size={16} />,
		isEnabled: true,
		itemKey: 'keyboard-shortcuts',
	},
];

export const helpSupportDropdownMenuItems: SidebarItem[] = [
	{
		key: 'documentation',
		label: (
			<div className="nav-item-label-container">
				<span>Documentation</span>
				<ArrowUpRight size={14} />
			</div>
		),
		icon: <Book size={14} />,
		isExternal: true,
		url: 'https://signoz.io/docs',
		itemKey: 'documentation',
	},
	{
		key: 'github',
		label: (
			<div className="nav-item-label-container">
				<span>GitHub</span>
				<ArrowUpRight size={14} />
			</div>
		),

		icon: <Github size={14} />,
		isExternal: true,
		url: 'https://github.com/signoz/signoz',
		itemKey: 'github',
	},
	{
		key: 'slack',
		label: (
			<div className="nav-item-label-container">
				<span>Community Slack</span>
				<ArrowUpRight size={14} />
			</div>
		),
		icon: <Slack size={14} />,
		isExternal: true,
		url: 'https://signoz.io/slack',
		itemKey: 'community-slack',
	},
	{
		key: 'chat-support',
		label: 'Chat with Support',
		icon: <MessageSquareText size={14} />,
		itemKey: 'chat-support',
	},
	{
		key: ROUTES.SHORTCUTS,
		label: 'Keyboard Shortcuts',
		icon: <Keyboard size={14} />,
		itemKey: 'keyboard-shortcuts',
	},
	{
		key: 'invite-collaborators',
		label: 'Invite a Team Member',
		icon: <Plus size={14} />,
		itemKey: 'invite-collaborators',
	},
];

/** Mapping of some newly added routes and their corresponding active sidebar menu key */
export const NEW_ROUTES_MENU_ITEM_KEY_MAP: Record<string, string> = {
	[ROUTES.TRACE]: ROUTES.TRACES_EXPLORER,
	[ROUTES.TRACE_EXPLORER]: ROUTES.TRACES_EXPLORER,
	[ROUTES.LOGS_BASE]: ROUTES.LOGS_EXPLORER,
	[ROUTES.METRICS_EXPLORER_BASE]: ROUTES.METRICS_EXPLORER,
	[ROUTES.INFRASTRUCTURE_MONITORING_BASE]:
		ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
	[ROUTES.API_MONITORING_BASE]: ROUTES.API_MONITORING,
	[ROUTES.MESSAGING_QUEUES_BASE]: ROUTES.MESSAGING_QUEUES_OVERVIEW,
};

export default menuItems;
