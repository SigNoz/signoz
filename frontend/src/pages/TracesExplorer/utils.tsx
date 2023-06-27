import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import TimeSeriesView from 'container/TimeSeriesView';
import { DataSource } from 'types/common/queryBuilder';

export const getTabsItems = (): TabsProps['items'] => [
	{
		label: 'Time Series',
		key: PANEL_TYPES.TIME_SERIES,
		children: <TimeSeriesView dataSource={DataSource.TRACES} />,
	},
	{
		label: 'Traces',
		key: PANEL_TYPES.TRACE,
		children: <div>Traces tab</div>,
	},
];
