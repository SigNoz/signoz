/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export type GetMetricAttributesParams = {
	/**
	 * @type string
	 * @description The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies).
	 */
	metricName: string;
	/**
	 * @type integer,null
	 * @description Start of the time range as a Unix timestamp in milliseconds.
	 */
	start?: number | null;
	/**
	 * @type integer,null
	 * @description End of the time range as a Unix timestamp in milliseconds.
	 */
	end?: number | null;
};
