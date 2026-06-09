import type { DashboardtypesTimeSeriesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { buildBaseConfig } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/baseConfigBuilder';
import {
	FILL_MODE_MAP,
	LINE_INTERPOLATION_MAP,
	LINE_STYLE_MAP,
	resolveSpanGaps,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/chartAppearanceMappings';
import { resolveSeriesLabel } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel';
import getLabelName from 'lib/getLabelName';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import {
	DrawStyle,
	FillMode,
	LineInterpolation,
	LineStyle,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { hasSingleVisiblePoint } from 'lib/uPlotV2/utils/dataUtils';
import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import type { BuilderQuery } from 'types/api/v5/queryRange';

const DEFAULT_POINT_SIZE = 5;

export interface BuildTimeSeriesConfigArgs {
	panelId: string;
	spec: DashboardtypesTimeSeriesPanelSpecDTO;
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
 * Builds a fully-wired `UPlotConfigBuilder` for a TimeSeries panel.
 *
 * Delegates the panel-agnostic scaffolding (scales, thresholds, axes,
 * drag-to-zoom, click plugin) to the shared `buildBaseConfig`, then layers
 * in the TimeSeries-specific concern: one series per result, with visuals
 * resolved from `spec.chartAppearance`.
 */
export function buildTimeSeriesConfig({
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
}: BuildTimeSeriesConfigArgs): UPlotConfigBuilder {
	const builder = buildBaseConfig({
		panelId,
		panelType: PANEL_TYPES.TIME_SERIES,
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
	spec: DashboardtypesTimeSeriesPanelSpecDTO;
	builderQueries: BuilderQuery[];
	apiResponse: MetricQueryRangeSuccessResponse | undefined;
	isDarkMode: boolean;
}

/**
 * Adds one uPlot series per result row to the scaffolded builder. The visual
 * resolution (line style, interpolation, fill mode, span gaps) reads from
 * `spec.chartAppearance`; the label is resolved via the legend matrix in
 * `resolveSeriesLabel`. Mutates the builder in place.
 */
function addSeriesFromResponse({
	builder,
	spec,
	builderQueries,
	apiResponse,
	isDarkMode,
}: AddSeriesArgs): void {
	if (!apiResponse?.payload?.data?.result) {
		return;
	}

	const chartAppearance = spec.chartAppearance;
	// `customColors` is nullable on the spec; coerce so `addSeries` always gets
	// a defined record (it dereferences keys without a guard).
	const colorMapping = spec.legend?.customColors ?? {};
	const spanGaps = resolveSpanGaps(chartAppearance?.spanGaps?.fillLessThan);

	const lineStyle = chartAppearance?.lineStyle
		? LINE_STYLE_MAP[chartAppearance.lineStyle]
		: LineStyle.Solid;
	const lineInterpolation = chartAppearance?.lineInterpolation
		? LINE_INTERPOLATION_MAP[chartAppearance.lineInterpolation]
		: LineInterpolation.Spline;
	const fillMode = chartAppearance?.fillMode
		? FILL_MODE_MAP[chartAppearance.fillMode]
		: FillMode.None;

	apiResponse.payload.data.result.forEach((series) => {
		const hasSingleValidPoint = hasSingleVisiblePoint(series.values);
		const baseLabel = getLabelName(
			series.metric,
			series.queryName || '',
			series.legend || '',
		);
		const label = resolveSeriesLabel(series, builderQueries, baseLabel);

		builder.addSeries({
			scaleKey: 'y',
			// A single visible point can't be drawn as a line — degrade to points
			// so the user still sees the datum (matches V1 behavior).
			drawStyle: hasSingleValidPoint ? DrawStyle.Points : DrawStyle.Line,
			label,
			colorMapping,
			spanGaps,
			lineStyle,
			lineInterpolation,
			showPoints: chartAppearance?.showPoints || hasSingleValidPoint,
			pointSize: DEFAULT_POINT_SIZE,
			fillMode,
			isDarkMode,
			metric: series.metric,
		});
	});
}
