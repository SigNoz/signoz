/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface MetricsexplorertypesTreemapEntryDTO {
	/**
	 * @type string
	 * @description The name of the metric.
	 */
	metricName: string;
	/**
	 * @type number
	 * @format double
	 * @description Share of the total across all metrics in the time range, from 0 to 100.
	 */
	percentage: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Time series count or sample count for the metric, depending on the requested mode.
	 */
	totalValue: number;
}
