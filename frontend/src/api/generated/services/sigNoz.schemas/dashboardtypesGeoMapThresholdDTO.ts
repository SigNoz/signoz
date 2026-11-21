/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesComparisonOperatorDTO } from './dashboardtypesComparisonOperatorDTO';

export interface DashboardtypesGeoMapThresholdDTO {
	/**
	 * @type string
	 * @description The CSS color of the shape, bubble or point while the threshold is active, for example #F1575F; CSS named colors such as red also work.
	 */
	color: string;
	/**
	 * @description The comparison that activates the threshold: above (default), below, above_or_equal, below_or_equal, equal or not_equal.
	 */
	operator?: DashboardtypesComparisonOperatorDTO;
	/**
	 * @type string
	 * @description The unit id of value, such as ms or percent. Empty means the colorBy column's unit.
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 * @description The value compared against, in unit.
	 */
	value: number;
}
