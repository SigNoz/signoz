/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesGCPConnectionMethodDTO } from './cloudintegrationtypesGCPConnectionMethodDTO';
import type { CloudintegrationtypesGCPTelemetryCollectionStrategyDTO } from './cloudintegrationtypesGCPTelemetryCollectionStrategyDTO';

export interface CloudintegrationtypesGCPIntegrationConfigDTO {
	connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO;
	/**
	 * @type string
	 */
	deploymentProjectId: string;
	/**
	 * @type string
	 */
	deploymentRegion: string;
	/**
	 * @type array
	 */
	projectIds: string[];
	telemetryCollectionStrategy: CloudintegrationtypesGCPTelemetryCollectionStrategyDTO;
}
