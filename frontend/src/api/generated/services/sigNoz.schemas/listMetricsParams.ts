/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export type ListMetricsParams = {
	/**
	 * @type integer,null
	 * @description Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0; applied only when end is also set.
	 */
	start?: number | null;
	/**
	 * @type integer,null
	 * @description End of the time range as a Unix timestamp in milliseconds. Must be greater than start; applied only when start is also set.
	 */
	end?: number | null;
	/**
	 * @type integer
	 * @description Maximum number of metric names to return. Defaults to 100; must not exceed 5000.
	 */
	limit?: number;
	/**
	 * @type string
	 * @description Case-insensitive substring to match against metric names.
	 */
	searchText?: string;
	/**
	 * @type string
	 * @description Set to meter to list Cost Meter metrics instead of telemetry metrics.
	 */
	source?: string;
};
