import type { DashboardtypesBarChartPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getInitialStackedBands } from 'container/DashboardContainer/visualization/charts/utils/stackSeriesUtils';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { buildBaseConfig } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/baseConfigBuilder';
import { resolveSeriesLabelV5 } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel';
import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { toClickPluginPayload } from 'pages/DashboardPageV2/DashboardContainer/queryV5/uplotData';
import getLabelName from 'lib/getLabelName';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import type { BuilderQuery } from 'types/api/v5/queryRange';

export interface BuildBarChartConfigArgs {
	panelId: string;
	spec: DashboardtypesBarChartPanelSpecDTO;
	/**
	 * Flat list of builder queries on this panel (see `getBuilderQueries`).
	 * Powers per-query legend resolution; empty for non-builder panels.
	 */
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
		panelType: PANEL_TYPES.BAR,
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
 * Adds one bar series per flattened V5 series, plus uPlot bands for stacking
 * when `spec.visualization.stackedBarChart` is set. Each series receives its
 * own per-query step interval so bar widths line up with the actual
 * sampling cadence reported by the backend.
 *
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

	if (spec.visualization?.stackedBarChart) {
		// uPlot uses 1-based series indices (index 0 is the timestamp axis);
		// `+1` keeps the band targets aligned with the series we're about to add.
		builder.setBands(getInitialStackedBands(series.length + 1));
	}

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
