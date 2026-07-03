import { useMemo } from 'react';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { getBuilderQueries } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';
import { resolveSeriesLabelV5 } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import {
	flattenTimeSeries,
	getTimeSeriesResults,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

export interface LegendSeries {
	/** Resolved display label — the key `legend.customColors` is indexed by. */
	label: string;
	/** The series' auto-assigned color, shown when no override is set. */
	defaultColor: string;
}

/**
 * Resolves the panel's rendered series into `{ label, defaultColor }` pairs, using the
 * exact label resolution the time-series renderer applies (`flattenTimeSeries` →
 * `resolveSeriesLabelV5`) and the same `generateColor` default. The legend-colors control
 * keys overrides by these labels, so they must match what the chart draws. Deduplicated,
 * order-preserving; empty until data arrives or for kinds without flat time-series data.
 */
export function useLegendSeries(
	panel: DashboardtypesPanelDTO,
	data: PanelQueryData,
): LegendSeries[] {
	const isDarkMode = useIsDarkMode();

	return useMemo(() => {
		const palette = isDarkMode
			? themeColors.chartcolors
			: themeColors.lightModeColor;
		const series = flattenTimeSeries(
			getTimeSeriesResults(data?.response),
			data.legendMap,
		);
		const builderQueries = getBuilderQueries(panel.spec.queries);

		const byLabel = new Map<string, string>();
		series.forEach((s) => {
			const baseLabel = getLabelName(s.labels, s.queryName, s.legend);
			const label = resolveSeriesLabelV5(s, builderQueries, baseLabel);
			if (label && !byLabel.has(label)) {
				byLabel.set(label, generateColor(label, palette));
			}
		});

		return Array.from(byLabel, ([label, defaultColor]) => ({
			label,
			defaultColor,
		}));
	}, [panel.spec.queries, data.response, data.legendMap, isDarkMode]);
}
