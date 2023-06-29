import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import TimeSeriesView from 'container/TimeSeriesView';
import ListView from 'container/TracesExplorer/ListView';
import { DataSource } from 'types/common/queryBuilder';

export const getTabsItems = (
	isListViewDisabled: boolean,
): TabsProps['items'] => [
	{
		label: 'Time Series',
		key: PANEL_TYPES.TIME_SERIES,
		children: <TimeSeriesView dataSource={DataSource.TRACES} />,
	},
	{
		label: 'List View',
		key: PANEL_TYPES.LIST,
		children: <ListView />,
		disabled: isListViewDisabled,
	},
];
