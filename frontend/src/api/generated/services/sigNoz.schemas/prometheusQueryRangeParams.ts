/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export type PrometheusQueryRangeParams = {
	/**
	 * @type string
	 * @description PromQL expression.
	 */
	query: string;
	/**
	 * @type string
	 * @description Range start: RFC3339 or float unix seconds.
	 */
	start: string;
	/**
	 * @type string
	 * @description Range end: RFC3339 or float unix seconds.
	 */
	end: string;
	/**
	 * @type string
	 * @description Resolution step: duration string or float seconds.
	 */
	step: string;
	/**
	 * @type string
	 * @description Evaluation timeout: duration string or float seconds.
	 */
	timeout?: string;
	/**
	 * @type string
	 * @description Any non-empty value includes query statistics in the response.
	 */
	stats?: string;
};
