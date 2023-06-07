import { TabsProps } from 'antd';
import TimeSeriesView from 'container/TracesExplorer/TimeSeriesView';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { TracesExplorerTabs } from './constants';

export const getTabsItems = (currentQuery: Query): TabsProps['items'] => [
	{
		label: 'Time Series',
		key: TracesExplorerTabs.TIME_SERIES,
		children: <TimeSeriesView query={currentQuery} />,
	},
	{
		label: 'Traces',
		key: TracesExplorerTabs.TRACES,
		children: <div>Traces</div>,
	},
];
