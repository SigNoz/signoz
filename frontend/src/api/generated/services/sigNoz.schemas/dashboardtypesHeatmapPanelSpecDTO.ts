/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBasicVisualizationDTO } from './dashboardtypesBasicVisualizationDTO';
import type { DashboardtypesHeatmapAxesDTO } from './dashboardtypesHeatmapAxesDTO';
import type { DashboardtypesHeatmapChartAppearanceDTO } from './dashboardtypesHeatmapChartAppearanceDTO';
import type { DashboardtypesLegendDTO } from './dashboardtypesLegendDTO';
import type { DashboardtypesPanelFormattingDTO } from './dashboardtypesPanelFormattingDTO';

export interface DashboardtypesHeatmapPanelSpecDTO {
	/**
	 * @description The Y axis scale.
	 */
	axes?: DashboardtypesHeatmapAxesDTO;
	/**
	 * @description How bucket counts map to colors.
	 */
	chartAppearance?: DashboardtypesHeatmapChartAppearanceDTO;
	/**
	 * @description Unit and decimal precision of the bucket bounds.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @description Legend placement and series colors.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @description The time range the heatmap covers.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}
