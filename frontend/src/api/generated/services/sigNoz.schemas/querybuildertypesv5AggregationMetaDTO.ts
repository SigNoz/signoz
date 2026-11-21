/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface Querybuildertypesv5AggregationMetaDTO {
	/**
	 * @type array
	 * @description The ascending upper bounds of the value buckets, set for heatmap and distribution results; each point then carries one count per bound plus a trailing overflow count in values. The first bucket starts at -Inf when its bound is at or under zero, else at zero.
	 */
	buckets?: number[];
	/**
	 * @type string
	 * @description The unit of the aggregated values, taken from metric metadata when known.
	 */
	unit?: string;
}
