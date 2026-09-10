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
		panelKind: 'signoz/TimeSeriesPanel',
		label: 'Time Series',
		Icon: ChartLine,
	},
	{ panelKind: 'signoz/NumberPanel', label: 'Number', Icon: Hash },
	{ panelKind: 'signoz/TablePanel', label: 'Table', Icon: Table },
	{ panelKind: 'signoz/BarChartPanel', label: 'Bar Chart', Icon: BarChart },
	{ panelKind: 'signoz/PieChartPanel', label: 'Pie Chart', Icon: ChartPie },
	{ panelKind: 'signoz/HistogramPanel', label: 'Histogram', Icon: BarChart },
	{ panelKind: 'signoz/ListPanel', label: 'List', Icon: List },
];
