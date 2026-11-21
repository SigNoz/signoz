/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesAreaChartAppearanceDTO } from './dashboardtypesAreaChartAppearanceDTO';
import type { DashboardtypesAreaChartVisualizationDTO } from './dashboardtypesAreaChartVisualizationDTO';
import type { DashboardtypesAxesDTO } from './dashboardtypesAxesDTO';
import type { DashboardtypesLegendDTO } from './dashboardtypesLegendDTO';
import type { DashboardtypesPanelFormattingDTO } from './dashboardtypesPanelFormattingDTO';
import type { DashboardtypesThresholdWithLabelDTO } from './dashboardtypesThresholdWithLabelDTO';

export interface DashboardtypesAreaChartPanelSpecDTO {
	/**
	 * @description Y axis bounds and scale.
	 */
	axes?: DashboardtypesAxesDTO;
	/**
	 * @description Line and fill drawing options.
	 */
	chartAppearance?: DashboardtypesAreaChartAppearanceDTO;
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
	 * @description Time range, gap handling and stacking.
	 */
	visualization?: DashboardtypesAreaChartVisualizationDTO;
}
