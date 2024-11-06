import './InfraMonitoring.styles.scss';

import { Color } from '@signozhq/design-tokens';
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
	wait: number;
	load15: number;
	active: React.ReactNode;
}

export const getHostListsQuery = (): HostListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	groupBy: [],
	orderBy: { columnName: '', order: 'asc' },
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
		sorter: true,
	},
	{
		title: 'Memory Usage',
		dataIndex: 'memory',
		key: 'memory',
		width: 100,
		sorter: true,
	},
	{
		title: 'IOWait',
		dataIndex: 'wait',
		key: 'wait',
		width: 100,
		sorter: true,
	},
	{
		title: 'Load Avg',
		dataIndex: 'load15',
		key: 'load15',
		width: 100,
		sorter: true,
	},
];

export const formatDataForTable = (data: HostData[]): HostRowData[] =>
	data.map((host, index) => ({
		key: `${host.hostName}-${index}`,
		hostName: host.hostName || '',
		active: (
			<Tag
				color={host.active ? 'success' : 'default'}
				bordered
				className="infra-monitoring-tags"
			>
				{host.active ? 'ACTIVE' : 'INACTIVE'}
			</Tag>
		),
		cpu: (
			<div className="progress-container">
				<Progress
					percent={Number((host.cpu * 100).toFixed(1))}
					size="small"
					strokeColor={((): string => {
						const cpuPercent = Number((host.cpu * 100).toFixed(1));
						if (cpuPercent >= 90) return Color.BG_SAKURA_500;
						if (cpuPercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar"
				/>
			</div>
		),
		memory: (
			<div className="progress-container">
				<Progress
					percent={Number((host.memory * 100).toFixed(1))}
					size="small"
					strokeColor={((): string => {
						const memoryPercent = Number((host.memory * 100).toFixed(1));
						if (memoryPercent >= 90) return Color.BG_CHERRY_500;
						if (memoryPercent >= 60) return Color.BG_AMBER_500;
						return Color.BG_FOREST_500;
					})()}
					className="progress-bar"
				/>
			</div>
		),
		wait: host.wait,
		load15: host.load15,
	}));
