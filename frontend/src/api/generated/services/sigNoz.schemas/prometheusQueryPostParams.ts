/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export type PrometheusQueryPostParams = {
	/**
	 * @type string
	 * @description PromQL expression.
	 */
	query: string;
	/**
	 * @type string
	 * @description Evaluation timestamp: RFC3339 or float unix seconds. Defaults to the server's current time.
	 */
	time?: string;
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
