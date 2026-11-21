/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPrecisionOptionDTO } from './dashboardtypesPrecisionOptionDTO';
import type { DashboardtypesTableFormattingDTOColumnUnits } from './dashboardtypesTableFormattingDTOColumnUnits';

export interface DashboardtypesTableFormattingDTO {
	/**
	 * @type object,null
	 * @description Unit id per value column, keyed by the column key: the query name for a builder query with one aggregation (A), the query name dotted with the aggregation expression for several (A.count()), or the SQL alias for a ClickHouse SQL column. Aggregation aliases are display labels, not keys.
	 */
	columnUnits?: DashboardtypesTableFormattingDTOColumnUnits;
	/**
	 * @description Decimal places shown: 0, 1, 2 (default), 3, 4 or full.
	 */
	decimalPrecision?: DashboardtypesPrecisionOptionDTO;
}
