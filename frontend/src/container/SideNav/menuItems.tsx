import {
	AlertOutlined,
	AlignLeftOutlined,
	BarChartOutlined,
	BugOutlined,
	DashboardFilled,
	DeploymentUnitOutlined,
	FileDoneOutlined,
	LineChartOutlined,
	MenuOutlined,
	RocketOutlined,
	SettingOutlined,
} from '@ant-design/icons';
import ROUTES from 'constants/routes';

import { SidebarMenu } from './sideNav.types';

const menuItems: SidebarMenu[] = [
	{
		key: ROUTES.GET_STARTED,
		label: 'Get Started',
		icon: <RocketOutlined rotate={45} />,
	},
	{
		key: ROUTES.APPLICATION,
		label: 'Services',
		icon: <BarChartOutlined />,
	},
	{
		key: ROUTES.TRACE,
		label: 'Traces',
		icon: <MenuOutlined />,
	},
	{
		key: ROUTES.LOGS_EXPLORER,
		label: 'Logs',
		icon: <AlignLeftOutlined />,
	},
	{
		key: ROUTES.ALL_DASHBOARD,
		label: 'Dashboards',
		icon: <DashboardFilled />,
	},
	{
		key: ROUTES.LIST_ALL_ALERT,
		label: 'Alerts',
		icon: <AlertOutlined />,
	},
	{
		key: ROUTES.ALL_ERROR,
		label: 'Exceptions',
		icon: <BugOutlined />,
	},
	{
		key: ROUTES.SERVICE_MAP,
		label: 'Service Map',
		icon: <DeploymentUnitOutlined />,
	},
	{
		key: ROUTES.USAGE_EXPLORER,
		label: 'Usage Explorer',
		icon: <LineChartOutlined />,
	},
	{
		key: ROUTES.BILLING,
		label: 'Billing',
		icon: <FileDoneOutlined />,
	},
	{
		key: ROUTES.SETTINGS,
		label: 'Settings',
		icon: <SettingOutlined />,
	},
];

/** Mapping of some newly added routes and their corresponding active sidebar menu key */
export const NEW_ROUTES_MENU_ITEM_KEY_MAP = {
	[ROUTES.TRACES_EXPLORER]: ROUTES.TRACE,
	[ROUTES.TRACE_EXPLORER]: ROUTES.TRACE,
	[ROUTES.LOGS_EXPLORER]: ROUTES.LOGS_EXPLORER,
};

export default menuItems;
