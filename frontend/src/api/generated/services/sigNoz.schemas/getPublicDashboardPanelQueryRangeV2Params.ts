/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export type GetPublicDashboardPanelQueryRangeV2Params = {
	/**
	 * @type string
	 * @description Start of the time range as a Unix timestamp in milliseconds. Honored only when the public dashboard has timeRangeEnabled.
	 */
	startTime?: string;
	/**
	 * @type string
	 * @description End of the time range as a Unix timestamp in milliseconds. Honored only when the public dashboard has timeRangeEnabled.
	 */
	endTime?: string;
};
