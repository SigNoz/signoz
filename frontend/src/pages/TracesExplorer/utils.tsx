import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import TimeSeriesView from 'container/TimeSeriesView';
import ListView from 'container/TracesExplorer/ListView';
import TracesView from 'container/TracesExplorer/TracesView';
import { DataSource } from 'types/common/queryBuilder';

interface GetTabsItemsProps {
	isListViewDisabled: boolean;
}

export const getTabsItems = ({
	isListViewDisabled,
}: GetTabsItemsProps): TabsProps['items'] => [
	{
		label: 'List View',
		key: PANEL_TYPES.LIST,
		children: <ListView />,
		disabled: isListViewDisabled,
	},
	{
		label: 'Traces',
		key: PANEL_TYPES.TRACE,
		children: <TracesView />,
		disabled: isListViewDisabled,
	},
	{
		label: 'Time Series',
		key: PANEL_TYPES.TIME_SERIES,
		children: <TimeSeriesView dataSource={DataSource.TRACES} />,
	},
];
