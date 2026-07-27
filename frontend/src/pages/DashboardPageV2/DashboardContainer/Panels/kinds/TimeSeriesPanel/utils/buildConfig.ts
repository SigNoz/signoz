import type { DashboardtypesTimeSeriesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import {
	buildBaseConfig,
	minStepInterval,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/baseConfigBuilder';
import {
	FILL_MODE_MAP,
	LINE_INTERPOLATION_MAP,
	LINE_STYLE_MAP,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/chartAppearance/enumMaps';
import { resolveSpanGaps } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/chartAppearance/resolvers';
import { resolveSeriesLabelV5 } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel';
import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import {
	hasSingleVisiblePoint,
	toClickPluginPayload,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/uplotData';
import getLabelName from 'lib/getLabelName';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import {
	DrawStyle,
	FillMode,
	LineInterpolation,
	LineStyle,
} from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import type { BuilderQuery } from 'types/api/v5/queryRange';

const DEFAULT_POINT_SIZE = 5;

export interface BuildTimeSeriesConfigArgs {
	panelId: string;
	spec: DashboardtypesTimeSeriesPanelSpecDTO;
	/** Flat list of builder queries (see `getBuilderQueries`); powers per-query legend resolution. */
	builderQueries: BuilderQuery[];
	/** Flattened V5 series (see `flattenTimeSeries`). */
	series: PanelSeries[];
	/** Per-query step intervals from the response exec stats. */
	stepIntervals?: Record<string, number>;
	isDarkMode: boolean;
	timezone: Timezone;
	panelMode: PanelMode;
	onDragSelect?: (start: number, end: number) => void;
	onClick?: OnClickPluginOpts['onClick'];
	minTimeScale?: number;
	maxTimeScale?: number;
}

/** Builds a `UPlotConfigBuilder` for a TimeSeries panel: shared scaffolding plus one series per result. */
export function buildTimeSeriesConfig({
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
	spec: DashboardtypesTimeSeriesPanelSpecDTO;
	builderQueries: BuilderQuery[];
	series: PanelSeries[];
	/** Per-query step intervals (seconds); floor for a numeric spanGaps threshold. */
	stepIntervals?: Record<string, number>;
	isDarkMode: boolean;
}

/**
 * Adds one uPlot series per flattened V5 series; mutates the builder in place.
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
	const fillMode = chartAppearance?.fillMode
		? FILL_MODE_MAP[chartAppearance.fillMode]
		: FillMode.None;

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
			isDarkMode,
			metric: s.labels,
		});
	});
}
