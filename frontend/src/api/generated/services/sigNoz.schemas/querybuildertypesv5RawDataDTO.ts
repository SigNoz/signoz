/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5RawRowDTO } from './querybuildertypesv5RawRowDTO';

export interface Querybuildertypesv5RawDataDTO {
	/**
	 * @type string
	 * @description The cursor to pass in the next request to continue from the last row; empty when there are no more rows.
	 */
	nextCursor?: string;
	/**
	 * @type string
	 * @description The name of the query that produced these rows.
	 */
	queryName?: string;
	/**
	 * @type array,null
	 * @description The matching records in the requested order.
	 */
	rows?: Querybuildertypesv5RawRowDTO[] | null;
}
