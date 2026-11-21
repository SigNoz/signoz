/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBasicVisualizationDTO } from './dashboardtypesBasicVisualizationDTO';
import type { DashboardtypesLegendDTO } from './dashboardtypesLegendDTO';
import type { DashboardtypesScatterPlotAxesDTO } from './dashboardtypesScatterPlotAxesDTO';
import type { DashboardtypesScatterPlotChartAppearanceDTO } from './dashboardtypesScatterPlotChartAppearanceDTO';
import type { DashboardtypesScatterPlotDimensionsDTO } from './dashboardtypesScatterPlotDimensionsDTO';
import type { DashboardtypesScatterPlotThresholdDTO } from './dashboardtypesScatterPlotThresholdDTO';
import type { DashboardtypesTableFormattingDTO } from './dashboardtypesTableFormattingDTO';

export interface DashboardtypesScatterPlotPanelSpecDTO {
	/**
	 * @description Title, bounds and scale of each axis.
	 */
	axes?: DashboardtypesScatterPlotAxesDTO;
	/**
	 * @description Dot drawing options.
	 */
	chartAppearance?: DashboardtypesScatterPlotChartAppearanceDTO;
	/**
	 * @description Which result columns place, size and color the dots. Each dot is one row of the joined scalar result: one group.
	 */
	dimensions?: DashboardtypesScatterPlotDimensionsDTO;
	/**
	 * @description Per-column units and decimal precision. The x and y columns' units label their axes; every bound column's unit shows in the tooltip.
	 */
	formatting?: DashboardtypesTableFormattingDTO;
	/**
	 * @description Legend placement and series colors. A series is one color group, labeled by its colorBy values joined with a comma, or All when nothing is grouped.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @type array,null
	 * @description Reference lines drawn at fixed values across the x or y axis.
	 */
	thresholds?: DashboardtypesScatterPlotThresholdDTO[] | null;
	/**
	 * @description The time range the groups are computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}
