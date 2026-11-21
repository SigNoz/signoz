/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBasicVisualizationDTO } from './dashboardtypesBasicVisualizationDTO';
import type { DashboardtypesComparisonThresholdDTO } from './dashboardtypesComparisonThresholdDTO';
import type { DashboardtypesPanelFormattingDTO } from './dashboardtypesPanelFormattingDTO';

export interface DashboardtypesNumberPanelSpecDTO {
	/**
	 * @description Unit and decimal precision of the value.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @type array,null
	 * @description Rules that recolor the value when it compares to a threshold as specified.
	 */
	thresholds?: DashboardtypesComparisonThresholdDTO[] | null;
	/**
	 * @description The time range the value is computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}
