import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { themeColors } from 'constants/theme';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { preparePieData } from '../kinds/PieChartPanel/prepareData';
import { prepareScatterPlotData } from '../kinds/ScatterPlotPanel/utils/prepareData';
import { ScatterPlotDataStatus } from '../kinds/ScatterPlotPanel/types';
import { getBuilderQueries } from './getBuilderQueries';
import { resolveSeriesLabelV5 } from './resolveSeriesLabel';
import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import {
	flattenTimeSeries,
	getScalarResults,
	getTimeSeriesResults,
} from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

export interface LegendSeries {
	/** Resolved display label — the key `legend.customColors` is indexed by. */
	label: string;
	/** The series' auto-assigned color, shown when no override is set. */
	defaultColor: string;
}

type PanelQueries = DashboardtypesPanelDTO['spec']['queries'];

interface LegendSeriesArgs {
	/** The kind's own spec, for kinds whose labels depend on it. */
	spec: DashboardtypesPanelSpecDTO;
	queries: PanelQueries;
	data: PanelQueryData;
	isDarkMode: boolean;
}

/** Resolves a kind's output into the legend entries the colors control keys overrides by. */
export type LegendSeriesResolver = (args: LegendSeriesArgs) => LegendSeries[];

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
export function resolvePieLegendSeries({
	data,
	isDarkMode,
}: LegendSeriesArgs): LegendSeries[] {
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
export function resolveTimeSeriesLegendSeries({
	queries,
	data,
	isDarkMode,
}: LegendSeriesArgs): LegendSeries[] {
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

/**
 * Scatter Plot: one entry per colour group, which `dimensions.colorBy` picks, so the
 * labels come from the same data prep the renderer runs.
 */
export function resolveScatterLegendSeries({
	spec,
	data,
	isDarkMode,
}: LegendSeriesArgs): LegendSeries[] {
	if (spec.plugin.kind !== 'signoz/ScatterPlotPanel') {
		return [];
	}
	const palette = isDarkMode
		? themeColors.chartcolors
		: themeColors.lightModeColor;
	const scatterData = prepareScatterPlotData({
		table: prepareScalarTables({
			results: getScalarResults(data.response),
			legendMap: data.legendMap,
			requestPayload: data.requestPayload,
		}).find((candidate) => candidate.columns.length > 0),
		dimensions: spec.plugin.spec.dimensions,
		axes: spec.plugin.spec.axes,
		columnUnits: {},
	});
	if (scatterData.status !== ScatterPlotDataStatus.Ready) {
		return [];
	}
	return buildLegendSeries(
		scatterData.series.map((series) => series.label),
		(label) => generateColor(label, palette),
	);
}
