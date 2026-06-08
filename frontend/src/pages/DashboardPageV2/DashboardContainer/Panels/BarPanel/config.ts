import type { DashboardtypesBarChartPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getInitialStackedBands } from 'container/DashboardContainer/visualization/charts/utils/stackSeriesUtils';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { buildBaseConfig } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/baseConfigBuilder';
import { resolveSeriesLabel } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel';
import getLabelName from 'lib/getLabelName';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import type { BuilderQuery } from 'types/api/v5/queryRange';

export interface BuildBarChartConfigArgs {
	panelId: string;
	spec: DashboardtypesBarChartPanelSpecDTO;
	/**
	 * Flat list of builder queries on this panel (see `getBuilderQueries`).
	 * Powers per-query legend resolution; empty for non-builder panels.
	 */
	builderQueries: BuilderQuery[];
	apiResponse: MetricQueryRangeSuccessResponse | undefined;
	isDarkMode: boolean;
	timezone: Timezone;
	panelMode: PanelMode;
	onDragSelect?: (start: number, end: number) => void;
	onClick?: OnClickPluginOpts['onClick'];
	minTimeScale?: number;
	maxTimeScale?: number;
}

/**
 * Builds a fully-wired `UPlotConfigBuilder` for a Bar chart panel.
 *
 * Delegates the panel-agnostic scaffolding (scales, thresholds, axes,
 * drag-to-zoom, click plugin) to the shared `buildBaseConfig`, then layers
 * in the Bar-specific concerns: optional stacking via uPlot bands, plus
 * one bar series per result row.
 */
export function buildBarChartConfig({
	panelId,
	spec,
	builderQueries,
	apiResponse,
	isDarkMode,
	timezone,
	panelMode,
	onDragSelect,
	onClick,
	minTimeScale,
	maxTimeScale,
}: BuildBarChartConfigArgs): UPlotConfigBuilder {
	const builder = buildBaseConfig({
		panelId,
		panelType: PANEL_TYPES.BAR,
		isDarkMode,
		timezone,
		panelMode,
		isLogScale: spec.axes?.isLogScale,
		softMin: spec.axes?.softMin ?? undefined,
		softMax: spec.axes?.softMax ?? undefined,
		formatting: spec.formatting,
		thresholds: spec.thresholds,
		apiResponse,
		minTimeScale,
		maxTimeScale,
		onDragSelect,
		onClick,
	});

	addSeriesFromResponse({
		builder,
		spec,
		builderQueries,
		apiResponse,
		isDarkMode,
	});

	return builder;
}

interface AddSeriesArgs {
	builder: UPlotConfigBuilder;
	spec: DashboardtypesBarChartPanelSpecDTO;
	builderQueries: BuilderQuery[];
	apiResponse: MetricQueryRangeSuccessResponse | undefined;
	isDarkMode: boolean;
}

/**
 * Adds one bar series per result row, plus uPlot bands for stacking when
 * `spec.visualization.stackedBarChart` is set. Each series receives its
 * own per-query step interval so bar widths line up with the actual
 * sampling cadence reported by the backend.
 */
function addSeriesFromResponse({
	builder,
	spec,
	builderQueries,
	apiResponse,
	isDarkMode,
}: AddSeriesArgs): void {
	const result = apiResponse?.payload?.data?.result;
	if (!result) {
		return;
	}

	const stepIntervals =
		apiResponse?.payload?.data?.newResult?.meta?.stepIntervals;
	const colorMapping = spec.legend?.customColors ?? {};

	if (spec.visualization?.stackedBarChart) {
		// uPlot uses 1-based series indices (index 0 is the timestamp axis);
		// `+1` keeps the band targets aligned with the series we're about to add.
		builder.setBands(getInitialStackedBands(result.length + 1));
	}

	result.forEach((series) => {
		const baseLabel = getLabelName(
			series.metric,
			series.queryName || '',
			series.legend || '',
		);
		const label = resolveSeriesLabel(series, builderQueries, baseLabel);
		const stepInterval = series.queryName
			? stepIntervals?.[series.queryName]
			: undefined;

		builder.addSeries({
			scaleKey: 'y',
			drawStyle: DrawStyle.Bar,
			label,
			colorMapping,
			isDarkMode,
			stepInterval,
			metric: series.metric,
		});
	});
}
