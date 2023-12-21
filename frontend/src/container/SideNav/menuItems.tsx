import { RocketOutlined } from '@ant-design/icons';
import ROUTES from 'constants/routes';
import {
	AreaChart,
	BarChart2,
	BellDot,
	BugIcon,
	DraftingCompass,
	LayoutGrid,
	Receipt,
	Route,
	ScrollText,
	Settings,
} from 'lucide-react';

import { SidebarItem } from './sideNav.types';

const menuItems: SidebarItem[] = [
	{
		key: ROUTES.GET_STARTED,
		label: 'Get Started',
		icon: <RocketOutlined rotate={45} />,
	},
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
		key: ROUTES.LOGS_EXPLORER,
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
	[ROUTES.LOGS_EXPLORER]: ROUTES.LOGS_EXPLORER,
};

export default menuItems;
