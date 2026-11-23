/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesIntegrationConfigDTO } from './cloudintegrationtypesIntegrationConfigDTO';
import type { CloudintegrationtypesProviderIntegrationConfigDTO } from './cloudintegrationtypesProviderIntegrationConfigDTO';
import type { CloudintegrationtypesSyncStateDTO } from './cloudintegrationtypesSyncStateDTO';

export interface CloudintegrationtypesGettableAgentCheckInDTO {
	/**
	 * @type string
	 */
	account_id: string;
	/**
	 * @type string
	 */
	cloud_account_id: string;
	/**
	 * @type string
	 */
	cloudIntegrationId: string;
	integration_config: CloudintegrationtypesIntegrationConfigDTO | null;
	integrationConfig: CloudintegrationtypesProviderIntegrationConfigDTO;
	/**
	 * @type string
	 */
	providerAccountId: string;
	/**
	 * @type string,null
	 * @format date-time
	 */
	removed_at: string | null;
	/**
	 * @type string,null
	 * @format date-time
	 */
	removedAt: string | null;
	syncState: CloudintegrationtypesSyncStateDTO | null;
}
