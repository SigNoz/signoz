import type { DashboardtypesHistogramPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { buildBaseConfig } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/baseConfigBuilder';
import { resolveSeriesLabelV5 } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/resolveSeriesLabel';
import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import getLabelName from 'lib/getLabelName';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import type { BuilderQuery } from 'types/api/v5/queryRange';

const POINT_SIZE = 5;
const BAR_WIDTH_FACTOR = 1;
// Merged-series colors mirror the V1 default — single histogram bin gets a
// fixed blue-ish pair so the merged view looks the same as before.
const MERGED_SERIES_LINE_COLOR = '#3f5ecc';
const MERGED_SERIES_FILL_COLOR = '#4E74F8';

export interface BuildHistogramConfigArgs {
	panelId: string;
	spec: DashboardtypesHistogramPanelSpecDTO;
	/** Builder queries on this panel — used to resolve per-series labels. */
	builderQueries: BuilderQuery[];
	/** Flattened V5 series (see `flattenTimeSeries`). */
	series: PanelSeries[];
	isDarkMode: boolean;
	timezone: Timezone;
	panelMode: PanelMode;
}

/**
 * Builds a fully-wired `UPlotConfigBuilder` for a Histogram panel.
 *
 * Unlike time-axis panels, histograms have no time scale and no drag-to-zoom.
 * We still reuse `buildBaseConfig` for the consistent scaffolding (thresholds,
 * axes, click plugin) but then override the X/Y scales to be auto-linear
 * (`time: false, auto: true`) and install a histogram-specific cursor that
 * disables drag-pan and tightens focus proximity.
 */
export function buildHistogramConfig({
	panelId,
	spec,
	builderQueries,
	series,
	isDarkMode,
	timezone,
	panelMode,
}: BuildHistogramConfigArgs): UPlotConfigBuilder {
	// Histograms have no time axis — no stepIntervals, and no click plugin
	// (the renderer passes no onClick), so the base config needs no response.
	const builder = buildBaseConfig({
		panelId,
		panelType: PANEL_TYPES.HISTOGRAM,
		isDarkMode,
		timezone,
		panelMode,
	});

	builder.setCursor({
		drag: { x: false, y: false, setScale: true },
		focus: { prox: 1e3 },
	});

	// Override the time-axis scales from `buildBaseConfig` — histograms are
	// distribution plots, not time series.
	builder.addScale({ scaleKey: 'x', time: false, auto: true });
	builder.addScale({ scaleKey: 'y', time: false, auto: true, min: 0 });

	addSeries({ builder, spec, builderQueries, series, isDarkMode });

	return builder;
}

interface AddSeriesArgs {
	builder: UPlotConfigBuilder;
	spec: DashboardtypesHistogramPanelSpecDTO;
	builderQueries: BuilderQuery[];
	series: PanelSeries[];
	isDarkMode: boolean;
}

/**
 * Adds histogram bar series to the builder. When `mergeAllActiveQueries` is
 * set, `prepareHistogramData` produces a single Y column, so we add exactly
 * one series with the fixed merged-mode colors. Otherwise one series per
 * result row, with labels resolved via the standard legend matrix.
 */
function addSeries({
	builder,
	spec,
	builderQueries,
	series,
	isDarkMode,
}: AddSeriesArgs): void {
	const colorMapping = spec.legend?.customColors ?? {};
	const mergeAllActiveQueries =
		spec.histogramBuckets?.mergeAllActiveQueries ?? false;

	if (mergeAllActiveQueries) {
		builder.addSeries({
			scaleKey: 'y',
			label: '',
			drawStyle: DrawStyle.Histogram,
			colorMapping,
			barWidthFactor: BAR_WIDTH_FACTOR,
			pointSize: POINT_SIZE,
			lineColor: MERGED_SERIES_LINE_COLOR,
			fillColor: MERGED_SERIES_FILL_COLOR,
			isDarkMode,
		});
		return;
	}

	series.forEach((s) => {
		const baseLabel = getLabelName(s.labels, s.queryName, s.legend);
		const label = resolveSeriesLabelV5(s, builderQueries, baseLabel);

		builder.addSeries({
			scaleKey: 'y',
			label,
			drawStyle: DrawStyle.Histogram,
			colorMapping,
			barWidthFactor: BAR_WIDTH_FACTOR,
			pointSize: POINT_SIZE,
			isDarkMode,
		});
	});
}
