/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesAreaChartAppearanceDTOFillOpacity } from './dashboardtypesAreaChartAppearanceDTOFillOpacity';
import type { DashboardtypesAreaFillModeDTO } from './dashboardtypesAreaFillModeDTO';
import type { DashboardtypesLineInterpolationDTO } from './dashboardtypesLineInterpolationDTO';
import type { DashboardtypesLineStyleDTO } from './dashboardtypesLineStyleDTO';
import type { DashboardtypesSpanGapsDTO } from './dashboardtypesSpanGapsDTO';

export interface DashboardtypesAreaChartAppearanceDTO {
	/**
	 * @description The fill under each line: solid (default) or gradient.
	 */
	fillMode?: DashboardtypesAreaFillModeDTO;
	/**
	 * @description The fill opacity from 0 (transparent) to 1 (opaque). Null uses the chart default.
	 */
	fillOpacity?: DashboardtypesAreaChartAppearanceDTOFillOpacity;
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
