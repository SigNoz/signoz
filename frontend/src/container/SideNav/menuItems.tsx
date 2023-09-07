import {
	AlertOutlined,
	AlignLeftOutlined,
	ApiOutlined,
	BarChartOutlined,
	BugOutlined,
	DashboardFilled,
	DeploymentUnitOutlined,
	LineChartOutlined,
	MenuOutlined,
	SettingOutlined,
} from '@ant-design/icons';
import ROUTES from 'constants/routes';

import { SidebarMenu } from './sideNav.types';

const menuItems: SidebarMenu[] = [
	{
		key: ROUTES.APPLICATION,
		label: 'Services',
		icon: <BarChartOutlined />,
	},
	{
		key: ROUTES.TRACE,
		label: 'Traces',
		icon: <MenuOutlined />,
		// children: [
		// {
		// 	key: ROUTES.TRACE,
		// 	label: 'Traces',
		// },
		// TODO: uncomment when will be ready explorer
		// {
		// 	key: ROUTES.TRACES_EXPLORER,
		// 	label: "Explorer",
		// },
		// ],
	},
	{
		key: ROUTES.LOGS,
		label: 'Logs',
		icon: <AlignLeftOutlined />,
		// children: [
		// {
		// 	key: ROUTES.LOGS,
		// 	label: 'Search',
		// },
		// TODO: uncomment when will be ready explorer
		// {
		// 	key: ROUTES.LOGS_EXPLORER,
		// 	label: 'Views',
		// },
		// ],
		// {
		// 	key: ROUTES.PIPELINES,
		// 	label: 'Pipelines',
		// },
		// ],
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
		key: ROUTES.SETTINGS,
		label: 'Settings',
		icon: <SettingOutlined />,
	},
	{
		key: ROUTES.INSTRUMENTATION,
		label: 'Get Started',
		icon: <ApiOutlined />,
	},
];

/** Mapping of some newly added routes and their corresponding active sidebar menu key */
export const NEW_ROUTES_MENU_ITEM_KEY_MAP = {
	[ROUTES.TRACES_EXPLORER]: ROUTES.TRACE,
	[ROUTES.TRACE_EXPLORER]: ROUTES.TRACE,
	[ROUTES.LOGS_EXPLORER]: ROUTES.LOGS,
};

export default menuItems;
