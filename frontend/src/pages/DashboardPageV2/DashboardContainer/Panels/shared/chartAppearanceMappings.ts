import {
	DashboardtypesFillModeDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
	DashboardtypesPrecisionOptionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import {
	FillMode,
	LineInterpolation,
	LineStyle,
} from 'lib/uPlotV2/config/types';

/**
 * Bridges the V2 dashboard wire-format enums (snake_case, generated from Go)
 * to the uPlotV2 chart enums (PascalCase). String values diverge between the
 * two — don't coerce, map.
 *
 * Kept as a single source of truth so every panel that reads chart-appearance
 * fields stays in sync as either side's enum evolves.
 */

export const LINE_STYLE_MAP: Record<DashboardtypesLineStyleDTO, LineStyle> = {
	[DashboardtypesLineStyleDTO.solid]: LineStyle.Solid,
	[DashboardtypesLineStyleDTO.dashed]: LineStyle.Dashed,
};

export const LINE_INTERPOLATION_MAP: Record<
	DashboardtypesLineInterpolationDTO,
	LineInterpolation
> = {
	[DashboardtypesLineInterpolationDTO.linear]: LineInterpolation.Linear,
	[DashboardtypesLineInterpolationDTO.spline]: LineInterpolation.Spline,
	[DashboardtypesLineInterpolationDTO.step_after]: LineInterpolation.StepAfter,
	[DashboardtypesLineInterpolationDTO.step_before]: LineInterpolation.StepBefore,
};

export const FILL_MODE_MAP: Record<DashboardtypesFillModeDTO, FillMode> = {
	[DashboardtypesFillModeDTO.solid]: FillMode.Solid,
	[DashboardtypesFillModeDTO.gradient]: FillMode.Gradient,
	[DashboardtypesFillModeDTO.none]: FillMode.None,
};

export const LEGEND_POSITION_MAP: Record<
	DashboardtypesLegendPositionDTO,
	LegendPosition
> = {
	[DashboardtypesLegendPositionDTO.bottom]: LegendPosition.BOTTOM,
	[DashboardtypesLegendPositionDTO.right]: LegendPosition.RIGHT,
};

/**
 * `spec.formatting.decimalPrecision` is a stringified-digit enum on the wire
 * (`'0'`–`'4'` plus the sentinel `'full'`). The chart consumes a numeric
 * `PrecisionOption` (`0`–`4`) or the same `'full'` sentinel from its own
 * enum. Missing / unknown → `undefined` (chart uses its default).
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
 * `spec.chartAppearance.spanGaps.fillLessThan` is a stringified number on the
 * wire. Empty / missing → span all gaps (the chart default). Numeric → forward
 * the threshold so uPlot only bridges short runs of nulls.
 */
export function resolveSpanGaps(
	fillLessThan: string | undefined,
): boolean | number {
	if (!fillLessThan) {
		return true;
	}
	const parsed = Number(fillLessThan);
	return Number.isFinite(parsed) ? parsed : true;
}

/**
 * Resolves the legend position for a panel. Missing / unknown values fall
 * back to `BOTTOM` to match the chart's default and the V1 behavior.
 */
export function resolveLegendPosition(
	position: DashboardtypesLegendPositionDTO | undefined,
): LegendPosition {
	if (position && position in LEGEND_POSITION_MAP) {
		return LEGEND_POSITION_MAP[position];
	}
	return LegendPosition.BOTTOM;
}
