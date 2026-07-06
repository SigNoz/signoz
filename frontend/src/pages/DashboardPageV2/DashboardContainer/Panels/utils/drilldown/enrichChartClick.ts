import { isValidQueryName } from 'container/QueryTable/Drilldown/drilldownUtils';
import type { ChartClickData } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import type { DrilldownClickPayload } from '../../types/drilldown';

import { getGroupByFilters } from './getGroupByFilters';
import { resolveDrilldownSignal } from './signal';

interface EnrichChartClickArgs {
	clickData: ChartClickData;
	/** Flattened series in the same order they were added to uPlot (see `prepareAlignedData`/`addSeries`). */
	series: PanelSeries[];
	/** The panel's builder queries, for resolving the clicked series' signal by `queryName`. */
	builderQueries: BuilderQuery[];
	/** Explorer time window; the caller computes it (clicked bucket ±step for time charts, panel window for histograms). */
	timeRange?: { startTime: number; endTime: number };
}

/**
 * Turns a uPlot click (time-series or bar) into a drilldown payload. Resolves the clicked series via
 * uPlot's series index (index 0 is the x-axis, so data series start at 1 → `series[seriesIndex - 1]`)
 * and builds equality filters from its group-by label values. Returns `null` when the click can't be
 * attributed to a drillable series (no focused series, unmapped index, or a formula query).
 */
export function enrichChartClick({
	clickData,
	series,
	builderQueries,
	timeRange,
}: EnrichChartClickArgs): DrilldownClickPayload | null {
	const { focusedSeries } = clickData;
	if (!focusedSeries) {
		return null;
	}

	const panelSeries = series[focusedSeries.seriesIndex - 1];
	if (!panelSeries || !isValidQueryName(panelSeries.queryName)) {
		return null;
	}

	const builderQuery = builderQueries.find(
		(query) => query.name === panelSeries.queryName,
	);

	const filters = builderQuery
		? getGroupByFilters(panelSeries.labels, builderQuery)
		: [];

	return {
		coordinates: { x: clickData.absoluteMouseX, y: clickData.absoluteMouseY },
		context: {
			queryName: panelSeries.queryName,
			signal: resolveDrilldownSignal(builderQuery),
			filters,
			timeRange,
			label: focusedSeries.seriesName,
			seriesColor: focusedSeries.color,
		},
	};
}
