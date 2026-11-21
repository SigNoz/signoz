/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface Querybuildertypesv5TraceAggregationDTO {
	/**
	 * @type string
	 * @description The name the aggregation is reported under; when omitted, the result carries the alias __result_N, with N the zero-based index of the aggregation.
	 */
	alias?: string;
	/**
	 * @type string
	 * @description The aggregation over spans, such as count(), sum(item_price), p99(duration_nano) or countIf(day > 10).
	 */
	expression?: string;
}
