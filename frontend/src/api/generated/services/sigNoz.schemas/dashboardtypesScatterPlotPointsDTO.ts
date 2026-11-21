/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesScatterPlotPointsDTOMaxSize } from './dashboardtypesScatterPlotPointsDTOMaxSize';
import type { DashboardtypesScatterPlotPointsDTOMinSize } from './dashboardtypesScatterPlotPointsDTOMinSize';
import type { DashboardtypesScatterPlotPointsDTOOpacity } from './dashboardtypesScatterPlotPointsDTOOpacity';
import type { DashboardtypesScatterPlotPointsDTOSize } from './dashboardtypesScatterPlotPointsDTOSize';

export interface DashboardtypesScatterPlotPointsDTO {
	/**
	 * @description Diameter of the largest dot when dimensions.sizeBy is set, in CSS pixels from 2 to 40. Null means 24.
	 */
	maxSize?: DashboardtypesScatterPlotPointsDTOMaxSize;
	/**
	 * @description Diameter of the smallest dot when dimensions.sizeBy is set, in CSS pixels from 2 to 40. Null means 4.
	 */
	minSize?: DashboardtypesScatterPlotPointsDTOMinSize;
	/**
	 * @description Fill opacity of every dot, from 0.1 to 1. Null means 0.7.
	 */
	opacity?: DashboardtypesScatterPlotPointsDTOOpacity;
	/**
	 * @description Diameter of every dot when dimensions.sizeBy is unset, in CSS pixels from 2 to 40. Null means 6.
	 */
	size?: DashboardtypesScatterPlotPointsDTOSize;
}
