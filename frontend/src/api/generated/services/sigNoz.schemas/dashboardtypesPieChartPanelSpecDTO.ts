/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBasicVisualizationDTO } from './dashboardtypesBasicVisualizationDTO';
import type { DashboardtypesLegendDTO } from './dashboardtypesLegendDTO';
import type { DashboardtypesPanelFormattingDTO } from './dashboardtypesPanelFormattingDTO';

export interface DashboardtypesPieChartPanelSpecDTO {
	/**
	 * @description Unit and decimal precision of the slice values.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @description Legend placement and slice colors.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @description The time range the slices are computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}
