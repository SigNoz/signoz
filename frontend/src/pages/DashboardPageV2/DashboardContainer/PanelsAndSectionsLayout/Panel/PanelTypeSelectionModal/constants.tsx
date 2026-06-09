import {
	BarChart,
	ChartLine,
	ChartPie,
	Hash,
	List,
	Table,
} from '@signozhq/icons';

import type { PanelType } from './types';

export const PANEL_TYPES: PanelType[] = [
	{
		pluginKind: 'signoz/TimeSeriesPanel',
		label: 'Time Series',
		icon: <ChartLine size={16} />,
	},
	{ pluginKind: 'signoz/NumberPanel', label: 'Value', icon: <Hash size={16} /> },
	{ pluginKind: 'signoz/TablePanel', label: 'Table', icon: <Table size={16} /> },
	{
		pluginKind: 'signoz/BarChartPanel',
		label: 'Bar Chart',
		icon: <BarChart size={16} />,
	},
	{
		pluginKind: 'signoz/PieChartPanel',
		label: 'Pie Chart',
		icon: <ChartPie size={16} />,
	},
	{
		pluginKind: 'signoz/HistogramPanel',
		label: 'Histogram',
		icon: <BarChart size={16} />,
	},
	{ pluginKind: 'signoz/ListPanel', label: 'List', icon: <List size={16} /> },
];
