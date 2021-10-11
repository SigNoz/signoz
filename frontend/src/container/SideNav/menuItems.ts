import {
	AlignLeftOutlined,
	ApiOutlined,
	BarChartOutlined,
	DashboardFilled,
	DeploymentUnitOutlined,
	LineChartOutlined,
	SettingOutlined,
} from '@ant-design/icons';
import ROUTES from 'constants/routes';

const menus: SidebarMenu[] = [
	{
		Icon: BarChartOutlined,
		to: ROUTES.APPLICATION,
		name: 'Metrics',
	},
	{
		Icon: AlignLeftOutlined,
		to: ROUTES.TRACES,
		name: 'Traces',
	},
	{
		Icon: DashboardFilled,
		to: ROUTES.ALL_DASHBOARD,
		name: 'Dashboard',
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
		name: 'Add instrumentation',
	},
];

interface SidebarMenu {
	to: string;
	name: string;
	Icon: typeof ApiOutlined;
}

export default menus;
