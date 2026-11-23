/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesComparisonOperatorDTO } from './dashboardtypesComparisonOperatorDTO';
import type { DashboardtypesThresholdFormatDTO } from './dashboardtypesThresholdFormatDTO';

export interface DashboardtypesComparisonThresholdDTO {
	/**
	 * @type string
	 * @description The CSS color applied to the text or background, per format, while the threshold is active. For example #F1575F matches the SigNoz red preset; CSS named colors such as red also work.
	 */
	color: string;
	/**
	 * @description What the color is applied to: text (default) or background.
	 */
	format?: DashboardtypesThresholdFormatDTO;
	/**
	 * @description The comparison that activates the threshold: above (default), below, above_or_equal, below_or_equal, equal or not_equal.
	 */
	operator?: DashboardtypesComparisonOperatorDTO;
	/**
	 * @type string
	 * @description The unit id of value, such as ms or percent. Empty means the panel's unit, or the column's unit for a table threshold. Prefer the panel's unit; a different unit works only when it converts to it, such as s against a panel in ms.
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 * @description The value compared against, in unit.
	 */
	value: number;
}
