/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBasicVisualizationDTO } from './dashboardtypesBasicVisualizationDTO';
import type { DashboardtypesComparisonThresholdDTO } from './dashboardtypesComparisonThresholdDTO';
import type { DashboardtypesPanelFormattingDTO } from './dashboardtypesPanelFormattingDTO';
import type { DashboardtypesTopListAppearanceDTO } from './dashboardtypesTopListAppearanceDTO';

export interface DashboardtypesTopListPanelSpecDTO {
	/**
	 * @description Rank, share and bar color options.
	 */
	appearance?: DashboardtypesTopListAppearanceDTO;
	/**
	 * @description Unit and decimal precision of the values.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @type array,null
	 * @description Rules that recolor a row when its value compares to a threshold as specified.
	 */
	thresholds?: DashboardtypesComparisonThresholdDTO[] | null;
	/**
	 * @description The time range the rows are computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}
