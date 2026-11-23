/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesPostableAgentCheckInDTOData } from './cloudintegrationtypesPostableAgentCheckInDTOData';

export interface CloudintegrationtypesPostableAgentCheckInDTO {
	/**
	 * @type string
	 */
	account_id?: string;
	/**
	 * @type string
	 */
	cloud_account_id?: string;
	/**
	 * @type string
	 */
	cloudIntegrationId?: string;
	/**
	 * @type object,null
	 */
	data: CloudintegrationtypesPostableAgentCheckInDTOData;
	/**
	 * @type string
	 */
	providerAccountId?: string;
	/**
	 * @type integer,null
	 */
	syncedVersion?: number | null;
}
