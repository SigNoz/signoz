import type { DashboardtypesBarChartPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import {
	buildBaseConfig,
	type TimeAxisChromeArgs,
} from 'pages/DashboardPage/DashboardContainer/Panels/utils/baseConfigBuilder';
import { resolveSeriesLabelV5 } from 'pages/DashboardPage/DashboardContainer/Panels/utils/resolveSeriesLabel';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { toClickPluginPayload } from 'pages/DashboardPage/DashboardContainer/queryV5/uplotData';
import getLabelName from 'lib/getLabelName';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import type { BuilderQuery } from 'types/api/v5/queryRange';

export interface BuildBarChartConfigArgs extends TimeAxisChromeArgs {
	spec: DashboardtypesBarChartPanelSpecDTO;
	/** Flat list of builder queries (see `getBuilderQueries`); powers per-query legend resolution. */
	builderQueries: BuilderQuery[];
	/** Flattened V5 series (see `flattenTimeSeries`). */
	series: PanelSeries[];
}

/** Builds a `UPlotConfigBuilder` for a Bar chart panel: shared scaffolding, optional stacking, one bar series per result. */
export function buildBarChartConfig({
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
}: BuildBarChartConfigArgs): UPlotConfigBuilder {
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
	spec: DashboardtypesBarChartPanelSpecDTO;
	builderQueries: BuilderQuery[];
	series: PanelSeries[];
	stepIntervals?: Record<string, number>;
	isDarkMode: boolean;
}

/**
 * Adds one bar series per flattened V5 series (plus stacking bands). Each gets its
 * own per-query step interval so bar widths match the backend's sampling cadence.
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
	const colorMapping = spec.legend?.customColors ?? {};

	series.forEach((s) => {
		const baseLabel = getLabelName(s.labels, s.queryName, s.legend);
		const label = resolveSeriesLabelV5(s, builderQueries, baseLabel);
		const stepInterval = s.queryName ? stepIntervals?.[s.queryName] : undefined;

		builder.addSeries({
			scaleKey: 'y',
			drawStyle: DrawStyle.Bar,
			label,
			colorMapping,
			isDarkMode,
			stepInterval,
			metric: s.labels,
		});
	});
}
