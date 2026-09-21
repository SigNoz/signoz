import { rangeUtil } from '@grafana/data';
import {
	type DashboardtypesAreaFillModeDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesPrecisionOptionDTO,
	type DashboardtypesSpanGapsDTO,
	type DashboardtypesStackModeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { FillMode, StackMode } from 'lib/uPlotV2/config/types';

import {
	AREA_FILL_MODE_MAP,
	LEGEND_POSITION_MAP,
	STACK_MODE_MAP,
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

/** Missing/unknown falls back to `Solid`; an area panel is never a bare line. */
export function resolveAreaFillMode(
	fillMode: DashboardtypesAreaFillModeDTO | undefined,
): FillMode {
	if (fillMode && fillMode in AREA_FILL_MODE_MAP) {
		return AREA_FILL_MODE_MAP[fillMode];
	}
	return FillMode.Solid;
}

/** Missing/unknown falls back to `None` — series drawn independently. */
export function resolveStackMode(
	stack: DashboardtypesStackModeDTO | undefined,
): StackMode {
	if (stack && stack in STACK_MODE_MAP) {
		return STACK_MODE_MAP[stack];
	}
	return StackMode.None;
}
