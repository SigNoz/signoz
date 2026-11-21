/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { GatewaytypesLimitDTO } from './gatewaytypesLimitDTO';

export interface GatewaytypesIngestionKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	created_at?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	expires_at?: string;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type array,null
	 */
	limits?: GatewaytypesLimitDTO[] | null;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type array,null
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updated_at?: string;
	/**
	 * @type string
	 */
	value?: string;
	/**
	 * @type string
	 */
	workspace_id?: string;
}
