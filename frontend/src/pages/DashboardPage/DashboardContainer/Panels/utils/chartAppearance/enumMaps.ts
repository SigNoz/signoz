import {
	DashboardtypesAreaFillModeDTO,
	DashboardtypesFillModeDTO,
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	DashboardtypesHeatmapPaletteDTO,
	DashboardtypesHeatmapYScaleDTO,
	DashboardtypesLegendPositionDTO,
	DashboardtypesLineInterpolationDTO,
	DashboardtypesLineStyleDTO,
	DashboardtypesStackModeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import omit from 'lodash-es/omit';
import {
	FillMode,
	LineInterpolation,
	LineStyle,
	StackMode,
} from 'lib/uPlotV2/config/types';
import { HeatmapAxisScale } from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import {
	ColorRampMode,
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

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

/** An area panel is always filled, so it drops `none`. */
export const AREA_FILL_MODE_MAP: Record<
	DashboardtypesAreaFillModeDTO,
	FillMode
> = omit(FILL_MODE_MAP, DashboardtypesFillModeDTO.none);

export const STACK_MODE_MAP: Record<DashboardtypesStackModeDTO, StackMode> = {
	[DashboardtypesStackModeDTO.none]: StackMode.None,
	[DashboardtypesStackModeDTO.normal]: StackMode.Normal,
	[DashboardtypesStackModeDTO.percent]: StackMode.Percent,
};

export const LEGEND_POSITION_MAP: Record<
	DashboardtypesLegendPositionDTO,
	LegendPosition
> = {
	[DashboardtypesLegendPositionDTO.bottom]: LegendPosition.BOTTOM,
	[DashboardtypesLegendPositionDTO.right]: LegendPosition.RIGHT,
};

export const HEATMAP_COLOR_MODE_MAP: Record<
	DashboardtypesHeatmapColorModeDTO,
	ColorRampMode
> = {
	[DashboardtypesHeatmapColorModeDTO.palette]: ColorRampMode.Palette,
	[DashboardtypesHeatmapColorModeDTO.opacity]: ColorRampMode.Opacity,
};

export const HEATMAP_COLOR_SCALE_MAP: Record<
	DashboardtypesHeatmapColorScaleDTO,
	ColorRampScale
> = {
	[DashboardtypesHeatmapColorScaleDTO.log]: ColorRampScale.Log,
	[DashboardtypesHeatmapColorScaleDTO.sqrt]: ColorRampScale.Sqrt,
	[DashboardtypesHeatmapColorScaleDTO.linear]: ColorRampScale.Linear,
};

export const HEATMAP_PALETTE_MAP: Record<
	DashboardtypesHeatmapPaletteDTO,
	ColorRampPalette
> = {
	[DashboardtypesHeatmapPaletteDTO.ice]: ColorRampPalette.Ice,
	[DashboardtypesHeatmapPaletteDTO.moss]: ColorRampPalette.Moss,
	[DashboardtypesHeatmapPaletteDTO.rust]: ColorRampPalette.Rust,
	[DashboardtypesHeatmapPaletteDTO.graphite]: ColorRampPalette.Graphite,
	[DashboardtypesHeatmapPaletteDTO.ember]: ColorRampPalette.Ember,
	[DashboardtypesHeatmapPaletteDTO.lagoon]: ColorRampPalette.Lagoon,
	[DashboardtypesHeatmapPaletteDTO.orchid]: ColorRampPalette.Orchid,
	[DashboardtypesHeatmapPaletteDTO.verdant]: ColorRampPalette.Verdant,
	[DashboardtypesHeatmapPaletteDTO.lava]: ColorRampPalette.Lava,
	[DashboardtypesHeatmapPaletteDTO.beacon]: ColorRampPalette.Beacon,
};

export const HEATMAP_Y_SCALE_MAP: Record<
	DashboardtypesHeatmapYScaleDTO,
	HeatmapAxisScale
> = {
	[DashboardtypesHeatmapYScaleDTO.auto]: HeatmapAxisScale.Auto,
	[DashboardtypesHeatmapYScaleDTO.linear]: HeatmapAxisScale.Linear,
	[DashboardtypesHeatmapYScaleDTO.log]: HeatmapAxisScale.Log,
	[DashboardtypesHeatmapYScaleDTO.symlog]: HeatmapAxisScale.Symlog,
};
