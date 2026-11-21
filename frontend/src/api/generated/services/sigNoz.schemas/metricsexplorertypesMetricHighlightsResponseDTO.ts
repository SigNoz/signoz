/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface MetricsexplorertypesMetricHighlightsResponseDTO {
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of distinct time series active in the last 120 minutes, approximate: a series that last reported early in that window can be missed.
	 */
	activeTimeSeries: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of samples ingested for the metric over retained data.
	 */
	dataPoints: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Unix timestamp in milliseconds of the most recently received sample.
	 */
	lastReceived: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of distinct time series for the metric over retained data.
	 */
	totalTimeSeries: number;
}
