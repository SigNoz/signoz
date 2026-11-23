/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesHeatmapColorModeDTO } from './dashboardtypesHeatmapColorModeDTO';
import type { DashboardtypesHeatmapColorScaleDTO } from './dashboardtypesHeatmapColorScaleDTO';
import type { DashboardtypesHeatmapPaletteDTO } from './dashboardtypesHeatmapPaletteDTO';

export interface DashboardtypesGeoMapColorsDTO {
	/**
	 * @type string
	 * @description The hex color varied in opacity mode. Empty uses the default fill.
	 */
	fill?: string;
	/**
	 * @type number,null
	 * @description The value mapped to the highest color. Null uses the highest value in the data.
	 */
	max?: number | null;
	/**
	 * @type number,null
	 * @description The value mapped to the lowest color. Null uses the lowest value in the data. Must not exceed max.
	 */
	min?: number | null;
	/**
	 * @description How values are colored: palette (default) picks a hue from palette, opacity varies the opacity of fill.
	 */
	mode?: DashboardtypesHeatmapColorModeDTO;
	/**
	 * @description The named color ramp used in palette mode, such as lava (default), ice or ember.
	 */
	palette?: DashboardtypesHeatmapPaletteDTO;
	/**
	 * @description How values map onto the color range: log (default), sqrt or linear.
	 */
	scale?: DashboardtypesHeatmapColorScaleDTO;
	/**
	 * @type integer
	 * @description The number of distinct color steps, 2 to 128. 0 uses the chart default.
	 */
	steps?: number;
}
