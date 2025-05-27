import { RocketOutlined } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import {
	BarChart2,
	BellDot,
	Binoculars,
	Book,
	Boxes,
	BugIcon,
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
	},
	{
		key: ROUTES.APPLICATION,
		label: 'Services',
		icon: <HardDrive size={16} />,
	},

	{
		key: ROUTES.LOGS,
		label: 'Logs',
		icon: <ScrollText size={16} />,
	},
	{
		key: ROUTES.METRICS_EXPLORER,
		label: 'Metrics',
		icon: <BarChart2 size={16} />,
		isNew: true,
	},
	{
		key: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
		label: 'Infra Monitoring',
		icon: <Boxes size={16} />,
	},
	{
		key: ROUTES.ALL_DASHBOARD,
		label: 'Dashboards',
		icon: <LayoutGrid size={16} />,
	},
	{
		key: ROUTES.MESSAGING_QUEUES_OVERVIEW,
		label: 'Messaging Queues',
		icon: <ListMinus size={16} />,
	},
	{
		key: ROUTES.API_MONITORING,
		label: 'External APIs',
		icon: <Binoculars size={16} />,
		isNew: true,
	},
	{
		key: ROUTES.LIST_ALL_ALERT,
		label: 'Alerts',
		icon: <BellDot size={16} />,
	},
	{
		key: ROUTES.INTEGRATIONS,
		label: 'Integrations',
		icon: <Unplug size={16} />,
	},
	{
		key: ROUTES.ALL_ERROR,
		label: 'Exceptions',
		icon: <BugIcon size={16} />,
	},
	{
		key: ROUTES.SERVICE_MAP,
		label: 'Service Map',
		icon: <Route size={16} />,
		isBeta: true,
	},
	{
		key: ROUTES.BILLING,
		label: 'Billing',
		icon: <Receipt size={16} />,
	},
	{
		key: ROUTES.SETTINGS,
		label: 'Settings',
		icon: <Settings size={16} />,
	},
];

export const primaryMenuItems: SidebarItem[] = [
	{
		key: ROUTES.HOME,
		label: 'Home',
		icon: <Home size={16} />,
	},
	{
		key: ROUTES.LIST_ALL_ALERT,
		label: 'Alerts',
		icon: <BellDot size={16} />,
	},
	{
		key: ROUTES.ALL_DASHBOARD,
		label: 'Dashboards',
		icon: <LayoutGrid size={16} />,
	},
];

export const defaultMoreMenuItems: SidebarItem[] = [
	{
		key: ROUTES.APPLICATION,
		label: 'Services',
		icon: <HardDrive size={16} />,
		isPinned: true,
		isEnabled: true,
	},
	{
		key: ROUTES.LOGS,
		label: 'Logs',
		icon: <ScrollText size={16} />,
		isPinned: true,
		isEnabled: true,
	},
	{
		key: ROUTES.TRACES_EXPLORER,
		label: 'Traces',
		icon: <DraftingCompass size={16} />,
		isPinned: true,
		isEnabled: true,
	},
	{
		key: ROUTES.METRICS_EXPLORER,
		label: 'Metrics',
		icon: <BarChart2 size={16} />,
		isNew: true,
		isEnabled: true,
	},
	{
		key: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
		label: 'Infrastructure',
		icon: <Boxes size={16} />,
		isPinned: true,
		isEnabled: true,
	},
	{
		key: ROUTES.INTEGRATIONS,
		label: 'Integrations',
		icon: <Unplug size={16} />,
		isEnabled: false,
	},
	{
		key: ROUTES.ALL_ERROR,
		label: 'Exceptions',
		icon: <BugIcon size={16} />,
		isEnabled: true,
	},
	{
		key: ROUTES.API_MONITORING,
		label: 'External APIs',
		icon: <Binoculars size={16} />,
		isNew: true,
		isEnabled: true,
	},
	{
		key: ROUTES.MESSAGING_QUEUES_OVERVIEW,
		label: 'Messaging Queues',
		icon: <ListMinus size={16} />,
		isEnabled: true,
	},
];

export const settingsMenuItems: SidebarItem[] = [
	{
		key: ROUTES.SETTINGS,
		label: 'General',
		icon: <Settings size={16} />,
		isEnabled: true,
	},
	{
		key: ROUTES.BILLING,
		label: 'Billing',
		icon: <Receipt size={16} />,
		isEnabled: false,
	},
	{
		key: ROUTES.ORG_SETTINGS,
		label: 'Members & SSO',
		icon: <User size={16} />,
		isEnabled: false,
	},
	{
		key: ROUTES.CUSTOM_DOMAIN_SETTINGS,
		label: 'Custom Domain',
		icon: <Globe size={16} />,
		isEnabled: true,
	},
	{
		key: ROUTES.INTEGRATIONS,
		label: 'Integrations',
		icon: <Unplug size={16} />,
		isEnabled: false,
	},
	{
		key: ROUTES.ALL_CHANNELS,
		label: 'Notification Channels',
		icon: <FileKey2 size={16} />,
		isEnabled: true,
	},
	{
		key: ROUTES.API_KEYS,
		label: 'API Keys',
		icon: <Key size={16} />,
		isEnabled: true,
	},
	{
		key: ROUTES.INGESTION_SETTINGS,
		label: 'Ingestion',
		icon: <RocketOutlined rotate={45} />,
		isEnabled: true,
	},
	{
		key: ROUTES.MY_SETTINGS,
		label: 'Account Settings',
		icon: <User size={16} />,
		isEnabled: true,
	},
	{
		key: ROUTES.SHORTCUTS,
		label: 'Keyboard Shortcuts',
		icon: <Layers2 size={16} />,
		isEnabled: true,
	},
];

export const helpSupportDropdownMenuItems: SidebarItem[] = [
	{
		key: 'documentation',
		label: 'Documentation',
		icon: <Book size={14} />,
		isExternal: true,
		url: 'https://signoz.io/docs',
	},
	{
		key: 'github',
		label: 'GitHub',
		icon: <Github size={14} />,
		isExternal: true,
		url: 'https://github.com/signoz/signoz',
	},
	{
		key: 'slack',
		label: 'Slack',
		icon: <Slack size={14} />,
		isExternal: true,
		url: 'https://signoz.slack.com',
	},
	{
		key: 'chat-support',
		label: 'Chat with Support',
		icon: <MessageSquareText size={14} />,
	},
	{
		key: ROUTES.SHORTCUTS,
		label: 'Keyboard Shortcuts',
		icon: <Keyboard size={14} />,
	},
	{
		key: 'invite-collaborators',
		label: 'Invite a Collaborator',
		icon: <Plus size={14} />,
	},
];

/** Mapping of some newly added routes and their corresponding active sidebar menu key */
export const NEW_ROUTES_MENU_ITEM_KEY_MAP: Record<string, string> = {
	[ROUTES.TRACE]: ROUTES.TRACES_EXPLORER,
	[ROUTES.TRACE_EXPLORER]: ROUTES.TRACES_EXPLORER,
	[ROUTES.LOGS_BASE]: ROUTES.LOGS_EXPLORER,
	[ROUTES.METRICS_EXPLORER_BASE]: ROUTES.METRICS_EXPLORER,
};

export default menuItems;
