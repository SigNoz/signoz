import { rangeUtil } from '@grafana/data';
import {
	DashboardtypesLegendPositionDTO,
	DashboardtypesPrecisionOptionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { LegendPosition } from 'lib/uPlotV2/components/types';

import { LEGEND_POSITION_MAP } from './enumMaps';

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
 * `spec.chartAppearance.spanGaps.fillLessThan` is a duration string on the wire
 * ("10m", "5s"). Empty/missing → span all gaps (default); otherwise forward the
 * threshold in seconds so uPlot only bridges short runs of nulls. Tolerates a
 * bare seconds number for back-compat.
 */
export function resolveSpanGaps(
	fillLessThan: string | undefined,
): boolean | number {
	if (!fillLessThan) {
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
