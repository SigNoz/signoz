import {
	DashboardtypesFillModeDTO,
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	DashboardtypesHeatmapPaletteDTO,
	DashboardtypesHeatmapYScaleDTO,
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
import {
	HeatmapAxisScale,
	HeatmapColorMode,
	HeatmapColorPalette,
	HeatmapColorScale,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

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

export const HEATMAP_COLOR_MODE_MAP: Record<
	DashboardtypesHeatmapColorModeDTO,
	HeatmapColorMode
> = {
	[DashboardtypesHeatmapColorModeDTO.palette]: HeatmapColorMode.Palette,
	[DashboardtypesHeatmapColorModeDTO.opacity]: HeatmapColorMode.Opacity,
};

export const HEATMAP_COLOR_SCALE_MAP: Record<
	DashboardtypesHeatmapColorScaleDTO,
	HeatmapColorScale
> = {
	[DashboardtypesHeatmapColorScaleDTO.log]: HeatmapColorScale.Log,
	[DashboardtypesHeatmapColorScaleDTO.sqrt]: HeatmapColorScale.Sqrt,
	[DashboardtypesHeatmapColorScaleDTO.linear]: HeatmapColorScale.Linear,
};

export const HEATMAP_PALETTE_MAP: Record<
	DashboardtypesHeatmapPaletteDTO,
	HeatmapColorPalette
> = {
	[DashboardtypesHeatmapPaletteDTO.ice]: HeatmapColorPalette.Ice,
	[DashboardtypesHeatmapPaletteDTO.moss]: HeatmapColorPalette.Moss,
	[DashboardtypesHeatmapPaletteDTO.rust]: HeatmapColorPalette.Rust,
	[DashboardtypesHeatmapPaletteDTO.graphite]: HeatmapColorPalette.Graphite,
	[DashboardtypesHeatmapPaletteDTO.ember]: HeatmapColorPalette.Ember,
	[DashboardtypesHeatmapPaletteDTO.lagoon]: HeatmapColorPalette.Lagoon,
	[DashboardtypesHeatmapPaletteDTO.orchid]: HeatmapColorPalette.Orchid,
	[DashboardtypesHeatmapPaletteDTO.verdant]: HeatmapColorPalette.Verdant,
	[DashboardtypesHeatmapPaletteDTO.lava]: HeatmapColorPalette.Lava,
	[DashboardtypesHeatmapPaletteDTO.beacon]: HeatmapColorPalette.Beacon,
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
