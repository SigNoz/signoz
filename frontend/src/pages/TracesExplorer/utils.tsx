import { TabsProps } from 'antd';
import TimeSeriesView from 'container/TracesExplorer/TimeSeriesView';

import { TracesExplorerTabs } from './constants';

export const getTabsItems = (): TabsProps['items'] => [
	{
		label: 'Time Series',
		key: TracesExplorerTabs.TIME_SERIES,
		children: <TimeSeriesView />,
	},
	{
		label: 'Traces',
		key: TracesExplorerTabs.TRACES,
		children: <div>Traces tab</div>,
	},
];
