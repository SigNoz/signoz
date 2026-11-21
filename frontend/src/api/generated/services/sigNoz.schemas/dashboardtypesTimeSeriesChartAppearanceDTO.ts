/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesFillModeDTO } from './dashboardtypesFillModeDTO';
import type { DashboardtypesLineInterpolationDTO } from './dashboardtypesLineInterpolationDTO';
import type { DashboardtypesLineStyleDTO } from './dashboardtypesLineStyleDTO';
import type { DashboardtypesSpanGapsDTO } from './dashboardtypesSpanGapsDTO';

export interface DashboardtypesTimeSeriesChartAppearanceDTO {
	/**
	 * @description The fill under each line: none (default), solid or gradient.
	 */
	fillMode?: DashboardtypesFillModeDTO;
	/**
	 * @description How points are joined: linear, spline (default), step_after or step_before.
	 */
	lineInterpolation?: DashboardtypesLineInterpolationDTO;
	/**
	 * @description The line stroke: solid (default) or dashed.
	 */
	lineStyle?: DashboardtypesLineStyleDTO;
	/**
	 * @type boolean
	 * @description Whether each data point is marked on the line.
	 */
	showPoints?: boolean;
	/**
	 * @description Whether lines connect across missing points.
	 */
	spanGaps?: DashboardtypesSpanGapsDTO;
}
