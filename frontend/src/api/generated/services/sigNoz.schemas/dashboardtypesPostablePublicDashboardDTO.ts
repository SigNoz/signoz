/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface DashboardtypesPostablePublicDashboardDTO {
	/**
	 * @type string
	 * @description The time range shown to anonymous viewers by default, as a Go duration such as 30m, 1h or 24h. Accepted units are ns, us, ms, s, m and h; write a day as 24h.
	 */
	defaultTimeRange?: string;
	/**
	 * @type boolean
	 * @description Whether anonymous viewers may change the time range.
	 */
	timeRangeEnabled?: boolean;
}
