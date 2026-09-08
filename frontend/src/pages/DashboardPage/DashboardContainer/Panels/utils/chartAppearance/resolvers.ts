import { rangeUtil } from '@grafana/data';
import {
	DashboardtypesHeatmapYScaleDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesPrecisionOptionDTO,
	type DashboardtypesHeatmapColorsDTO,
	type DashboardtypesSpanGapsDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { clampColorSteps } from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';
import {
	HeatmapAxisScale,
	type HeatmapColorOptions,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

import {
	HEATMAP_COLOR_MODE_MAP,
	HEATMAP_COLOR_SCALE_MAP,
	HEATMAP_PALETTE_MAP,
	HEATMAP_Y_SCALE_MAP,
	LEGEND_POSITION_MAP,
} from './enumMaps';

// Resolvers turning raw `spec` chart-appearance fields into runtime chart
// values, falling back to chart defaults for missing/unknown input.

/**
 * `spec.formatting.decimalPrecision` is a stringified-digit enum on the wire
 * (`'0'`–`'4'` plus the `'full'` sentinel). Maps to a numeric `PrecisionOption`
 * or the `'full'` sentinel; missing/unknown → `undefined` (chart default).
 */
export function resolveDecimalPrecision(
	precision: DashboardtypesPrecisionOptionDTO | undefined,
): PrecisionOption | undefined {
	if (!precision) {
		return undefined;
	}
	if (precision === DashboardtypesPrecisionOptionDTO.full) {
		return PrecisionOptionsEnum.FULL;
	}
	const parsed = Number(precision);
	if (
		parsed === 0 ||
		parsed === 1 ||
		parsed === 2 ||
		parsed === 3 ||
		parsed === 4
	) {
		return parsed;
	}
	return undefined;
}

/**
 * Resolves `spanGaps` to uPlot's value. `fillOnlyBelow: false` spans every gap regardless
 * of `fillLessThan`; a duration with no flag still thresholds (panels predating the flag).
 */
export function resolveSpanGaps(
	spanGaps: DashboardtypesSpanGapsDTO,
): boolean | number {
	const fillLessThan = spanGaps.fillLessThan;
	if (spanGaps.fillOnlyBelow === false || !fillLessThan) {
		return true;
	}
	const seconds = rangeUtil.isValidTimeSpan(fillLessThan)
		? rangeUtil.intervalToSeconds(fillLessThan)
		: Number(fillLessThan);
	return Number.isFinite(seconds) && seconds > 0 ? seconds : true;
}

/** Legend position; missing/unknown falls back to `BOTTOM` (chart default, V1 parity). */
export function resolveLegendPosition(
	position: DashboardtypesLegendPositionDTO | undefined,
): LegendPosition {
	if (position && position in LEGEND_POSITION_MAP) {
		return LEGEND_POSITION_MAP[position];
	}
	return LegendPosition.BOTTOM;
}

/**
 * Row-height distribution of a heatmap's bucket axis. Missing/unknown resolves to
 * `auto`, the one option that reads the bucket bounds rather than overriding them.
 */
export function resolveHeatmapAxisScale(
	yScale: DashboardtypesHeatmapYScaleDTO | undefined,
): HeatmapAxisScale {
	if (yScale && yScale in HEATMAP_Y_SCALE_MAP) {
		return HEATMAP_Y_SCALE_MAP[yScale];
	}
	return HeatmapAxisScale.Auto;
}

/**
 * `chartAppearance.colors` → the chart's colour options. Only fields the spec sets
 * are returned: the chart spreads this over its own defaults, so an explicit
 * `undefined` would erase one. `null` bounds pass through — that is the spec's own
 * way of asking for a derived one.
 */
export function resolveHeatmapColors(
	colors: DashboardtypesHeatmapColorsDTO | undefined,
): Partial<HeatmapColorOptions> {
	if (!colors) {
		return {};
	}
	return {
		...(colors.mode && { mode: HEATMAP_COLOR_MODE_MAP[colors.mode] }),
		...(colors.scale && { scale: HEATMAP_COLOR_SCALE_MAP[colors.scale] }),
		...(colors.palette && { palette: HEATMAP_PALETTE_MAP[colors.palette] }),
		...(colors.steps !== undefined && {
			steps: clampColorSteps(colors.steps),
		}),
		...(colors.minCount !== undefined && { minCount: colors.minCount }),
		...(colors.maxCount !== undefined && { maxCount: colors.maxCount }),
		...(colors.fill !== undefined && { fill: colors.fill }),
	};
}
