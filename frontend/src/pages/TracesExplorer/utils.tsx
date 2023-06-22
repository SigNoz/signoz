import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ListView from 'container/TracesExplorer/ListView';
import TableView from 'container/TracesExplorer/TableView';
import TimeSeriesView from 'container/TracesExplorer/TimeSeriesView';

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
		label: 'Time Series',
		key: PANEL_TYPES.TIME_SERIES,
		children: <TimeSeriesView />,
	},
	{
		label: 'Table View',
		key: PANEL_TYPES.TABLE,
		children: <TableView />,
	},
	{
		label: 'Table View',
		key: PANEL_TYPES.TABLE,
		children: <TableView />,
	},
];
