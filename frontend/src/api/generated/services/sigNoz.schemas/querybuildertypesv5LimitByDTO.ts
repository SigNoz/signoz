/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface Querybuildertypesv5LimitByDTO {
	/**
	 * @type array,null
	 * @description The group-by field names that partition the result before the limit is applied.
	 */
	keys?: string[] | null;
	/**
	 * @type string
	 * @description The aggregation alias or expression whose value ranks entries within each partition.
	 */
	value?: string;
}
