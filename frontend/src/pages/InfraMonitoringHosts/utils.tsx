import { TabsProps } from 'antd';
import { ColumnType } from 'antd/es/table';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import TabLabel from 'components/TabLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { getTimeRange } from 'utils/getTimeRange';

import HostsList from './HostsList';

// interface GetTabsItemsProps {
// 	isListViewDisabled: boolean;
// 	isFilterApplied: boolean;
// }

export const getHostListsQuery = (): HostListPayload => ({
	start: getTimeRange().startTime,
	end: getTimeRange().endTime,
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
		children: <HostsList isFilterApplied={false} />,
	},
];

export const getHostsListColumns = (): ColumnType<RowData>[] => [
	{
		title: 'Hostname',
		dataIndex: 'hostname',
		key: 'hostname',
		width: 200,
	},
	{
		title: 'CPU Usage',
		dataIndex: 'cpu_usage',
		key: 'cpu_usage',
		width: 150,
	},
	{
		title: 'Memory Usage',
		dataIndex: 'memory_usage',
		key: 'memory_usage',
		width: 150,
	},
	{
		title: 'Disk Usage',
		dataIndex: 'disk_usage',
		key: 'disk_usage',
		width: 150,
	},
];
