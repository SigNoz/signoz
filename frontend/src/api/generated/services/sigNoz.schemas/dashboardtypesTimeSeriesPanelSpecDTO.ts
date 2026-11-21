/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesAxesDTO } from './dashboardtypesAxesDTO';
import type { DashboardtypesLegendDTO } from './dashboardtypesLegendDTO';
import type { DashboardtypesPanelFormattingDTO } from './dashboardtypesPanelFormattingDTO';
import type { DashboardtypesThresholdWithLabelDTO } from './dashboardtypesThresholdWithLabelDTO';
import type { DashboardtypesTimeSeriesChartAppearanceDTO } from './dashboardtypesTimeSeriesChartAppearanceDTO';
import type { DashboardtypesTimeSeriesVisualizationDTO } from './dashboardtypesTimeSeriesVisualizationDTO';

export interface DashboardtypesTimeSeriesPanelSpecDTO {
	/**
	 * @description Y axis bounds and scale.
	 */
	axes?: DashboardtypesAxesDTO;
	/**
	 * @description Line drawing options.
	 */
	chartAppearance?: DashboardtypesTimeSeriesChartAppearanceDTO;
	/**
	 * @description Unit and decimal precision of the values.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @description Legend placement and series colors.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @type array,null
	 * @description Horizontal reference lines drawn at fixed values.
	 */
	thresholds?: DashboardtypesThresholdWithLabelDTO[] | null;
	/**
	 * @description Time range and gap handling.
	 */
	visualization?: DashboardtypesTimeSeriesVisualizationDTO;
}
