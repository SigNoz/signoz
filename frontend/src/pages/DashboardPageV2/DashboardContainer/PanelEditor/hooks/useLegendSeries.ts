import { useMemo } from 'react';
import { useIsDarkMode } from 'hooks/useDarkMode';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import {
	type LegendSeries,
	resolvePieLegendSeries,
	resolveTimeSeriesLegendSeries,
} from '../utils/legendSeries';

/**
 * Resolves the panel's rendered series into `{ label, defaultColor }` pairs so the
 * legend-colors control can key overrides by the exact labels the chart draws. Only the
 * kinds that expose a colors control resolve series (Pie from its scalar slices, Time
 * Series from its flat series); every other kind returns none.
 */
export function useLegendSeries(
	panel: DashboardtypesPanelDTO,
	data: PanelQueryData,
): LegendSeries[] {
	const isDarkMode = useIsDarkMode();

	return useMemo(() => {
		switch (panel.spec.plugin.kind) {
			case 'signoz/PieChartPanel':
				return resolvePieLegendSeries(data, isDarkMode);
			case 'signoz/TimeSeriesPanel':
			case 'signoz/BarChartPanel':
			case 'signoz/HistogramPanel':
				return resolveTimeSeriesLegendSeries(panel.spec.queries, data, isDarkMode);
			default:
				return [];
		}
	}, [panel.spec.plugin.kind, panel.spec.queries, data, isDarkMode]);
}
