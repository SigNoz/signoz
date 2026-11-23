/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface ZeustypesPostableProfileDTO {
	/**
	 * @type string
	 */
	existing_observability_tool: string;
	/**
	 * @type boolean
	 */
	has_existing_observability_tool: boolean;
	/**
	 * @type integer
	 * @format int64
	 */
	logs_scale_per_day_in_gb: number;
	/**
	 * @type integer
	 * @format int64
	 */
	number_of_hosts: number;
	/**
	 * @type integer
	 * @format int64
	 */
	number_of_services: number;
	/**
	 * @type array,null
	 */
	reasons_for_interest_in_signoz: string[] | null;
	/**
	 * @type string
	 */
	timeline_for_migrating_to_signoz: string;
	/**
	 * @type boolean
	 */
	uses_otel: boolean;
	/**
	 * @type string
	 */
	where_did_you_discover_signoz: string;
}
