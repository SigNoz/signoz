/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesComparisonOperatorDTO } from './dashboardtypesComparisonOperatorDTO';
import type { DashboardtypesThresholdFormatDTO } from './dashboardtypesThresholdFormatDTO';

export interface DashboardtypesTableThresholdDTO {
	/**
	 * @type string
	 * @description The CSS color applied to the text or background, per format, while the threshold is active. For example #F1575F matches the SigNoz red preset; CSS named colors such as red also work.
	 */
	color: string;
	/**
	 * @type string
	 * @description The key of the value column the rule applies to: the query name for a builder query with one aggregation (A), the query name dotted with the aggregation expression for several (A.count()), or the SQL alias for a ClickHouse SQL column. Group-by columns are never colored, and aggregation aliases are display labels, not keys.
	 */
	columnName: string;
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
