import { Progress, TabsProps, Tag } from 'antd';
import { ColumnType } from 'antd/es/table';
import { HostData, HostListPayload } from 'api/infraMonitoring/getHostLists';
import TabLabel from 'components/TabLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';

import HostsList from './HostsList';

export interface HostRowData {
	hostName: string;
	cpu: React.ReactNode;
	memory: React.ReactNode;
	ioWait: number;
	load15: number;
	active: React.ReactNode;
}

export const getHostListsQuery = (): HostListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	groupBy: [],
});
export const getTabsItems = (): TabsProps['items'] => [
	{
		label: <TabLabel label="List View" isDisabled={false} tooltipText="" />,
		key: PANEL_TYPES.LIST,
		children: <HostsList />,
	},
];

export const getHostsListColumns = (): ColumnType<HostRowData>[] => [
	{
		title: 'Hostname',
		dataIndex: 'hostName',
		key: 'hostName',
		width: 150,
	},
	{
		title: 'Status',
		dataIndex: 'active',
		key: 'active',
		width: 100,
	},
	{
		title: 'CPU Usage',
		dataIndex: 'cpu',
		key: 'cpu',
		width: 100,
		sorter: (a, b): number => {
			const getCpuValue = (cpuElement: React.ReactElement): number =>
				cpuElement.props.children.props.percent;
			const aCpu = getCpuValue(a.cpu as React.ReactElement);
			const bCpu = getCpuValue(b.cpu as React.ReactElement);
			return aCpu - bCpu;
		},
	},
	{
		title: 'Memory Usage',
		dataIndex: 'memory',
		key: 'memory',
		width: 100,
		sorter: (a, b): number => {
			const getMemoryValue = (memoryElement: React.ReactElement): number =>
				memoryElement.props.children.props.percent;

			const aMemory = getMemoryValue(a.memory as React.ReactElement);
			const bMemory = getMemoryValue(b.memory as React.ReactElement);
			return aMemory - bMemory;
		},
	},
	{
		title: 'IO Wait',
		dataIndex: 'ioWait',
		key: 'ioWait',
		width: 100,
		sorter: (a, b): number => a.ioWait - b.ioWait,
	},
	{
		title: 'Load Avg',
		dataIndex: 'load15',
		key: 'load15',
		width: 100,
		sorter: (a, b): number => a.load15 - b.load15,
	},
];

export const formatDataForTable = (data: HostData[]): HostRowData[] =>
	data.map((host, index) => ({
		key: `${host.hostName}-${index}`,
		hostName: host.hostName || '',
		active: (
			<Tag color={host.active ? 'success' : 'default'} bordered>
				{host.active ? 'ACTIVE' : 'INACTIVE'}
			</Tag>
		),
		cpu: (
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<Progress
					percent={Number((host.cpu * 100).toFixed(1))}
					size="small"
					strokeColor="#1890ff"
					style={{ flex: 1, marginRight: 8 }}
				/>
			</div>
		),
		memory: (
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<Progress
					percent={Number((host.memory * 100).toFixed(1))}
					size="small"
					strokeColor="#faad14"
					style={{ flex: 1, marginRight: 8 }}
				/>
			</div>
		),
		ioWait: host.wait,
		load15: host.load15,
	}));
