/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface DashboardtypesHistogramBucketsDTO {
	/**
	 * @type number,null
	 * @description The approximate target number of buckets. Ignored when bucketWidth is positive. Null uses the chart default.
	 */
	bucketCount?: number | null;
	/**
	 * @type number,null
	 * @description The width of each bucket in the value unit. A positive value takes precedence over bucketCount; null or 0 lets the chart choose.
	 */
	bucketWidth?: number | null;
	/**
	 * @type boolean
	 * @description Whether every series is combined into a single histogram instead of one per series.
	 */
	mergeAllActiveQueries?: boolean;
}
