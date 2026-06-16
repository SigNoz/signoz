import {
	DashboardtypesFillModeDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
} from 'api/generated/services/sigNoz.schemas';
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
