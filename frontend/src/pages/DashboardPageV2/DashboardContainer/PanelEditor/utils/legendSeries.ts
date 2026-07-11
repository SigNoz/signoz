import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { themeColors } from 'constants/theme';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { preparePieData } from 'pages/DashboardPageV2/DashboardContainer/Panels/kinds/PieChartPanel/prepareData';
import { getBuilderQueries } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';
import { resolveSeriesLabelV5 } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import {
	flattenTimeSeries,
	getScalarResults,
	getTimeSeriesResults,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

export interface LegendSeries {
	/** Resolved display label — the key `legend.customColors` is indexed by. */
	label: string;
	/** The series' auto-assigned color, shown when no override is set. */
	defaultColor: string;
}

type PanelQueries = DashboardtypesPanelDTO['spec']['queries'];

/**
 * Dedupes `labels` (first-seen order, empties dropped) into `{ label, defaultColor }`
 * pairs, resolving each unique label's color lazily via `colorFor` — so a repeated
 * label never resolves a second color.
 */
function buildLegendSeries(
	labels: readonly string[],
	colorFor: (label: string, index: number) => string,
): LegendSeries[] {
	const byLabel = new Map<string, string>();
	labels.forEach((label, index) => {
		if (label && !byLabel.has(label)) {
			byLabel.set(label, colorFor(label, index));
		}
	});
	return Array.from(byLabel, ([label, defaultColor]) => ({
		label,
		defaultColor,
	}));
}

/**
 * Pie is fed by scalar results, not time series. Reuse the exact slices the renderer
 * draws (without overrides, so their colors are the defaults) so the color control keys
 * overrides by the same labels the chart does.
 */
export function resolvePieLegendSeries(
	data: PanelQueryData,
	isDarkMode: boolean,
): LegendSeries[] {
	const slices = preparePieData({
		tables: prepareScalarTables({
			results: getScalarResults(data.response),
			legendMap: data.legendMap,
			requestPayload: data.requestPayload,
		}),
		isDarkMode,
	});
	return buildLegendSeries(
		slices.map((slice) => slice.label),
		(_, index) => slices[index].color,
	);
}

/**
 * Time-series kinds: resolve each flattened series' label the way the renderer does
 * (`getLabelName` → `resolveSeriesLabelV5`) and color it with `generateColor`.
 */
export function resolveTimeSeriesLegendSeries(
	queries: PanelQueries,
	data: PanelQueryData,
	isDarkMode: boolean,
): LegendSeries[] {
	const palette = isDarkMode
		? themeColors.chartcolors
		: themeColors.lightModeColor;
	const builderQueries = getBuilderQueries(queries);
	const series = flattenTimeSeries(
		getTimeSeriesResults(data.response),
		data.legendMap,
	);
	return buildLegendSeries(
		series.map((s) =>
			resolveSeriesLabelV5(
				s,
				builderQueries,
				getLabelName(s.labels, s.queryName, s.legend),
			),
		),
		(label) => generateColor(label, palette),
	);
}
