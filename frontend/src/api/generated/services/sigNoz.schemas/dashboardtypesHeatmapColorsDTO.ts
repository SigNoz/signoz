/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesHeatmapColorModeDTO } from './dashboardtypesHeatmapColorModeDTO';
import type { DashboardtypesHeatmapColorScaleDTO } from './dashboardtypesHeatmapColorScaleDTO';
import type { DashboardtypesHeatmapPaletteDTO } from './dashboardtypesHeatmapPaletteDTO';

export interface DashboardtypesHeatmapColorsDTO {
	/**
	 * @type string
	 * @description The hex color varied in opacity mode. Empty uses the series legend color.
	 */
	fill?: string;
	/**
	 * @type number,null
	 * @description The count mapped to the highest color. Null uses the highest count in the grid.
	 */
	maxCount?: number | null;
	/**
	 * @type number,null
	 * @description The count mapped to the lowest color. Null uses 0. Must not exceed maxCount.
	 */
	minCount?: number | null;
	/**
	 * @description How counts are colored: palette (default) picks a hue from palette, opacity varies the opacity of fill.
	 */
	mode?: DashboardtypesHeatmapColorModeDTO;
	/**
	 * @description The named color ramp used in palette mode, such as lava (default), ice or ember.
	 */
	palette?: DashboardtypesHeatmapPaletteDTO;
	/**
	 * @description How counts map onto the color range: log (default), sqrt or linear.
	 */
	scale?: DashboardtypesHeatmapColorScaleDTO;
	/**
	 * @type integer
	 * @description The number of distinct color steps, 2 to 128. 0 uses the chart default.
	 */
	steps?: number;
}
