/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface DashboardtypesSpanGapsDTO {
	/**
	 * @type string
	 * @description The largest gap still connected when fillOnlyBelow is true; longer gaps are left disconnected. Required in that case, as a positive Prometheus duration such as 30s, 5m or 1d.
	 */
	fillLessThan?: string;
	/**
	 * @type boolean
	 * @description Controls whether lines connect across null values. When false (default), all gaps are connected. When true, only gaps smaller than fillLessThan are connected.
	 */
	fillOnlyBelow?: boolean;
}
