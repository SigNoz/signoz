/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface Querybuildertypesv5TimeSeriesValueDTO {
	/**
	 * @type boolean
	 * @description True when the step is only partly covered by the requested time range, so the value is incomplete.
	 */
	partial?: boolean;
	/**
	 * @type integer
	 * @format int64
	 * @description The start of the step as a Unix timestamp in milliseconds.
	 */
	timestamp?: number;
	/**
	 * @type number
	 * @format double
	 * @description The aggregated value for the step; omitted for heatmap results, which use values.
	 */
	value?: number;
	/**
	 * @type array
	 * @description The per-bucket counts for heatmap results, in the order of meta.buckets plus a trailing overflow count.
	 */
	values?: number[];
}
