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
import type { MenuProps } from 'antd';
import ROUTES from 'constants/routes';

const menus: SidebarMenu[] = [
	{
		Icon: BarChartOutlined,
		to: ROUTES.APPLICATION,
		name: 'Services',
	},
	{
		Icon: MenuOutlined,
		to: ROUTES.TRACE,
		name: 'Traces',
	},
	{
		Icon: AlignLeftOutlined,
		to: ROUTES.LOGS,
		name: 'Logs',
		// tags: ['Beta'],
		// children: [
		// 	{
		// 		key: ROUTES.LOGS,
		// 		label: 'Search',
		// 	},
		// ],
	},
	{
		Icon: DashboardFilled,
		to: ROUTES.ALL_DASHBOARD,
		name: 'Dashboards',
	},
	{
		Icon: AlertOutlined,
		to: ROUTES.LIST_ALL_ALERT,
		name: 'Alerts',
	},
	{
		Icon: BugOutlined,
		to: ROUTES.ALL_ERROR,
		name: 'Exceptions',
	},
	{
		to: ROUTES.SERVICE_MAP,
		name: 'Service Map',
		Icon: DeploymentUnitOutlined,
	},
	{
		Icon: LineChartOutlined,
		to: ROUTES.USAGE_EXPLORER,
		name: 'Usage Explorer',
	},
	{
		Icon: SettingOutlined,
		to: ROUTES.SETTINGS,
		name: 'Settings',
	},
	{
		Icon: ApiOutlined,
		to: ROUTES.INSTRUMENTATION,
		name: 'Get Started',
	},
];

interface SidebarMenu {
	to: string;
	name: string;
	Icon: typeof ApiOutlined;
	tags?: string[];
	children?: Required<MenuProps>['items'][number][];
}

export default menus;
