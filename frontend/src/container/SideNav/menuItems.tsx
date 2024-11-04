import { RocketOutlined } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import {
	BarChart2,
	BellDot,
	Boxes,
	BugIcon,
	Cloudy,
	DraftingCompass,
	FileKey2,
	Layers2,
	LayoutGrid,
	ListMinus,
	MessageSquare,
	Receipt,
	Route,
	ScrollText,
	Settings,
	Slack,
	Unplug,
	// Unplug,
	UserPlus,
} from 'lucide-react';

import { SecondaryMenuItemKey, SidebarItem } from './sideNav.types';

export const getStartedMenuItem = {
	key: ROUTES.GET_STARTED,
	label: 'Get Started',
	icon: <RocketOutlined rotate={45} />,
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
	icon: <MessageSquare size={16} />,
};

export const shortcutMenuItem = {
	key: ROUTES.SHORTCUTS,
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
		key: ROUTES.APPLICATION,
		label: 'Services',
		icon: <BarChart2 size={16} />,
	},
	{
		key: ROUTES.TRACES_EXPLORER,
		label: 'Traces',
		icon: <DraftingCompass size={16} />,
	},
	{
		key: ROUTES.LOGS,
		label: 'Logs',
		icon: <ScrollText size={16} />,
	},
	// TODO - Enable this when the metrics explorer feature is read for release
	// {
	// 	key: ROUTES.METRICS_EXPLORER,
	// 	label: 'Metrics',
	// 	icon: <BarChart2 size={16} />,
	// 	isNew: true,
	// },
	{
		key: ROUTES.INFRASTRUCTURE_MONITORING_HOSTS,
		label: 'Infra Monitoring',
		icon: <Boxes size={16} />,
		isNew: true,
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

/** Mapping of some newly added routes and their corresponding active sidebar menu key */
export const NEW_ROUTES_MENU_ITEM_KEY_MAP: Record<string, string> = {
	[ROUTES.TRACE]: ROUTES.TRACES_EXPLORER,
	[ROUTES.TRACE_EXPLORER]: ROUTES.TRACES_EXPLORER,
	[ROUTES.LOGS_BASE]: ROUTES.LOGS_EXPLORER,
};

export default menuItems;
