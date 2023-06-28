import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import TimeSeriesView from 'container/TracesExplorer/TimeSeriesView';

export const getTabsItems = (): TabsProps['items'] => [
	{
		label: 'Time Series',
		key: PANEL_TYPES.TIME_SERIES,
		children: <TimeSeriesView />,
	},
	{
		label: 'Traces',
		key: PANEL_TYPES.TRACE,
		children: <div>Traces tab</div>,
	},
];
