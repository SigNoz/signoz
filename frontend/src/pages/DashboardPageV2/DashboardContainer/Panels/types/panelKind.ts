import { PANEL_TYPES } from 'constants/queryBuilder';

export type PanelKind =
	| 'signoz/TimeSeriesPanel'
	| 'signoz/BarChartPanel'
	| 'signoz/NumberPanel'
	| 'signoz/PieChartPanel'
	| 'signoz/TablePanel'
	| 'signoz/HistogramPanel'
	| 'signoz/ListPanel';

export const PANEL_KIND_TO_PANEL_TYPE: Record<PanelKind, PANEL_TYPES> = {
	'signoz/TimeSeriesPanel': PANEL_TYPES.TIME_SERIES,
	'signoz/BarChartPanel': PANEL_TYPES.BAR,
	'signoz/NumberPanel': PANEL_TYPES.VALUE,
	'signoz/PieChartPanel': PANEL_TYPES.PIE,
	'signoz/TablePanel': PANEL_TYPES.TABLE,
	'signoz/HistogramPanel': PANEL_TYPES.HISTOGRAM,
	'signoz/ListPanel': PANEL_TYPES.LIST,
};
