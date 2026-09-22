import type { DashboardtypesAreaChartPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import {
	buildBaseConfig,
	minStepInterval,
	type TimeAxisChromeArgs,
} from 'pages/DashboardPage/DashboardContainer/Panels/utils/baseConfigBuilder';
import {
	LINE_INTERPOLATION_MAP,
	LINE_STYLE_MAP,
} from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/enumMaps';
import {
	resolveAreaFillMode,
	resolveSpanGaps,
} from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/resolvers';
import { resolveSeriesLabelV5 } from 'pages/DashboardPage/DashboardContainer/Panels/utils/resolveSeriesLabel';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import {
	hasSingleVisiblePoint,
	toClickPluginPayload,
} from 'pages/DashboardPage/DashboardContainer/queryV5/uplotData';
import getLabelName from 'lib/getLabelName';
import {
	DrawStyle,
	LineInterpolation,
	LineStyle,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import type { BuilderQuery } from 'types/api/v5/queryRange';

const DEFAULT_POINT_SIZE = 5;

export interface BuildAreaChartConfigArgs extends TimeAxisChromeArgs {
	spec: DashboardtypesAreaChartPanelSpecDTO;
	/** Flat list of builder queries (see `getBuilderQueries`); powers per-query legend resolution. */
	builderQueries: BuilderQuery[];
	/** Flattened V5 series (see `flattenTimeSeries`). */
	series: PanelSeries[];
}

/**
 * Builds a `UPlotConfigBuilder` for an Area panel: shared scaffolding plus one filled
 * series per result. Stacking is declared on the chart component instead, which hands
 * it to the builder.
 */
export function buildAreaChartConfig({
	panelId,
	spec,
	builderQueries,
	series,
	stepIntervals,
	isDarkMode,
	timezone,
	panelMode,
	onDragSelect,
	onClick,
	minTimeScale,
	maxTimeScale,
}: BuildAreaChartConfigArgs): UPlotConfigBuilder {
	const builder = buildBaseConfig({
		panelId,
		isTimeAxis: true,
		isDarkMode,
		timezone,
		panelMode,
		isLogScale: spec.axes?.isLogScale,
		softMin: spec.axes?.softMin ?? undefined,
		softMax: spec.axes?.softMax ?? undefined,
		formatting: spec.formatting,
		thresholds: spec.thresholds,
		stepIntervals,
		clickPayload: toClickPluginPayload(series),
		minTimeScale,
		maxTimeScale,
		onDragSelect,
		onClick,
	});

	addSeries({
		builder,
		spec,
		builderQueries,
		series,
		stepIntervals,
		isDarkMode,
	});

	return builder;
}

interface AddSeriesArgs {
	builder: UPlotConfigBuilder;
	spec: DashboardtypesAreaChartPanelSpecDTO;
	builderQueries: BuilderQuery[];
	series: PanelSeries[];
	/** Per-query step intervals (seconds); floor for a numeric spanGaps threshold. */
	stepIntervals?: Record<string, number>;
	isDarkMode: boolean;
}

/**
 * Adds one filled uPlot series per flattened V5 series; mutates the builder in place.
 * Order must match `prepareAlignedData` — both iterate the same flat list.
 */
function addSeries({
	builder,
	spec,
	builderQueries,
	series,
	stepIntervals,
	isDarkMode,
}: AddSeriesArgs): void {
	const chartAppearance = spec.chartAppearance;
	// `customColors` is nullable on the spec; coerce so `addSeries` always gets
	// a defined record (it dereferences keys without a guard).
	const colorMapping = spec.legend?.customColors ?? {};
	const resolvedSpanGaps = chartAppearance?.spanGaps
		? resolveSpanGaps(chartAppearance.spanGaps)
		: true;
	// A numeric spanGaps is a max-gap threshold (seconds); floor it at the step interval so a
	// sub-step value doesn't break the line at every normal point. Boolean `true` passes through.
	const minStep = stepIntervals ? minStepInterval(stepIntervals) : undefined;
	const spanGaps =
		typeof resolvedSpanGaps === 'number' && minStep !== undefined
			? Math.max(minStep, resolvedSpanGaps)
			: resolvedSpanGaps;

	const lineStyle = chartAppearance?.lineStyle
		? LINE_STYLE_MAP[chartAppearance.lineStyle]
		: LineStyle.Solid;
	const lineInterpolation = chartAppearance?.lineInterpolation
		? LINE_INTERPOLATION_MAP[chartAppearance.lineInterpolation]
		: LineInterpolation.Spline;
	const fillMode = resolveAreaFillMode(chartAppearance?.fillMode);
	// Null and undefined both mean "kind default", which the chart layer resolves.
	const fillOpacity = chartAppearance?.fillOpacity ?? undefined;

	series.forEach((s) => {
		const hasSingleValidPoint = hasSingleVisiblePoint(s.values);
		const baseLabel = getLabelName(s.labels, s.queryName, s.legend);
		const label = resolveSeriesLabelV5(s, builderQueries, baseLabel);

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
			fillOpacity,
			isDarkMode,
			metric: s.labels,
		});
	});
}
