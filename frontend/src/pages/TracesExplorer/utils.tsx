import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ListView from 'container/TracesExplorer/ListView';
import TimeSeriesView from 'container/TracesExplorer/TimeSeriesView';

export const getTabsItems = (
	isListViewDisabled: boolean,
): TabsProps['items'] => [
	{
		label: 'Time Series',
		key: PANEL_TYPES.TIME_SERIES,
		children: <TimeSeriesView />,
	},
	{
		label: 'List View',
		key: PANEL_TYPES.LIST,
		children: <ListView />,
		disabled: isListViewDisabled,
	},
];
