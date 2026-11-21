/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesAxisScaleDTO } from './dashboardtypesAxisScaleDTO';

export interface DashboardtypesScatterPlotAxisDTO {
	/**
	 * @type string
	 * @description Axis title. Empty draws none; the tooltip still names the column.
	 */
	label?: string;
	/**
	 * @description auto (default) uses log, or symlog when values include zero or negatives, when that spreads the dots clearly more than linear does; otherwise linear. log cannot place a value at or below zero and leaves that dot out; symlog is log-like but places it.
	 */
	scale?: DashboardtypesAxisScaleDTO;
	/**
	 * @type number,null
	 * @description The highest value the axis always shows; data above it still extends the axis, as does a threshold on it. Null fits the data.
	 */
	softMax?: number | null;
	/**
	 * @type number,null
	 * @description The lowest value the axis always shows; data below it still extends the axis, as does a threshold on it. Null fits the data. A log axis ignores a bound at or below zero.
	 */
	softMin?: number | null;
}
