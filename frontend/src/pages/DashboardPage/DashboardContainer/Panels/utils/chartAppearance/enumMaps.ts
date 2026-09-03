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
 * Bridges the V2 wire-format enums to the uPlotV2 chart enums. String values
 * diverge between the two — don't coerce, map. Single source of truth shared by
 * every panel that reads chart-appearance fields.
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
