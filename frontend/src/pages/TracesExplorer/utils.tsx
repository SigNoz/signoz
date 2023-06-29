import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import TimeSeriesView from 'container/TimeSeriesView';
import TableView from 'container/TracesExplorer/TableView';
import { DataSource } from 'types/common/queryBuilder';

export const getTabsItems = (): TabsProps['items'] => [
	{
		label: 'Time Series',
		key: PANEL_TYPES.TIME_SERIES,
		children: <TimeSeriesView dataSource={DataSource.TRACES} />,
	},
	{
		label: 'Table View',
		key: PANEL_TYPES.TABLE,
		children: <TableView />,
	},
];
