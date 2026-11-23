/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesServiceConfigDTO } from './cloudintegrationtypesServiceConfigDTO';
import type { CloudintegrationtypesServiceIDDTO } from './cloudintegrationtypesServiceIDDTO';

/**
 * @nullable
 */
export type CloudintegrationtypesCloudIntegrationServiceDTO = {
	/**
	 * @type string
	 */
	cloudIntegrationId?: string;
	config?: CloudintegrationtypesServiceConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	id: string;
	type?: CloudintegrationtypesServiceIDDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
} | null;
