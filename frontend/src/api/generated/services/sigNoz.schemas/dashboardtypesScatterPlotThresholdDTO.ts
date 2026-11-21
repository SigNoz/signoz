/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesThresholdAxisDTO } from './dashboardtypesThresholdAxisDTO';

export interface DashboardtypesScatterPlotThresholdDTO {
	/**
	 * @description The axis the line marks: y (default) draws it horizontally, x vertically. Unit converts against that axis's column unit, and the axis extends to keep the line in view.
	 */
	axis?: DashboardtypesThresholdAxisDTO;
	/**
	 * @type string
	 * @description The CSS color of the line, for example #F1575F, which matches the SigNoz red preset; CSS named colors such as red also work.
	 */
	color: string;
	/**
	 * @type string
	 * @description The caption shown on the line.
	 */
	label?: string;
	/**
	 * @type string
	 * @description The unit id of value, such as ms or percent. Empty means the panel's unit, or the column's unit for a table threshold. Prefer the panel's unit; a different unit works only when it converts to it, such as s against a panel in ms.
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 * @description The value the line is drawn at, in unit.
	 */
	value: number;
}
