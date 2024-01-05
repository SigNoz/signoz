import { RocketOutlined } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import {
	AreaChart,
	BarChart2,
	BellDot,
	BugIcon,
	Cloudy,
	DraftingCompass,
	FileKey2,
	LayoutGrid,
	MessageSquare,
	Receipt,
	Route,
	ScrollText,
	Settings,
	Slack,
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
		key: ROUTES.TRACE,
		label: 'Traces',
		icon: <DraftingCompass size={16} />,
	},
	{
		key: ROUTES.LOGS,
		label: 'Logs',
		icon: <ScrollText size={16} />,
	},
	{
		key: ROUTES.ALL_DASHBOARD,
		label: 'Dashboards',
		icon: <LayoutGrid size={16} />,
	},
	{
		key: ROUTES.LIST_ALL_ALERT,
		label: 'Alerts',
		icon: <BellDot size={16} />,
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
	},
	{
		key: ROUTES.USAGE_EXPLORER,
		label: 'Usage Explorer',
		icon: <AreaChart size={16} />,
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
export const NEW_ROUTES_MENU_ITEM_KEY_MAP = {
	[ROUTES.TRACES_EXPLORER]: ROUTES.TRACE,
	[ROUTES.TRACE_EXPLORER]: ROUTES.TRACE,
	[ROUTES.LOGS_BASE]: ROUTES.LOGS_EXPLORER,
};

export default menuItems;
