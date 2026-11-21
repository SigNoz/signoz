/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5ColumnDescriptorDTO } from './querybuildertypesv5ColumnDescriptorDTO';

export interface Querybuildertypesv5ScalarDataDTO {
	/**
	 * @type array,null
	 * @description The column definitions, in the same order as the values in each data row.
	 */
	columns?: Querybuildertypesv5ColumnDescriptorDTO[] | null;
	/**
	 * @type array,null
	 * @description The rows, each a list of values aligned with columns.
	 */
	data?: unknown[][] | null;
	/**
	 * @type string
	 * @description The name of the query that produced this table.
	 */
	queryName?: string;
}
