/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { GatewaytypesLimitConfigDTO } from './gatewaytypesLimitConfigDTO';

export interface GatewaytypesPostableIngestionKeyLimitDTO {
	config?: GatewaytypesLimitConfigDTO;
	/**
	 * @type string
	 */
	keyId: string;
	/**
	 * @type string
	 */
	signal?: string;
	/**
	 * @type array,null
	 */
	tags?: string[] | null;
}
