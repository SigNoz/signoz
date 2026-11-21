/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface GatewaytypesPostableIngestionKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	expires_at?: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type array,null
	 */
	tags?: string[] | null;
}
