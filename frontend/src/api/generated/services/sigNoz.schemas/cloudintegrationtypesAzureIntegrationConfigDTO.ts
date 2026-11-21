/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAzureTelemetryCollectionStrategyDTO } from './cloudintegrationtypesAzureTelemetryCollectionStrategyDTO';

export interface CloudintegrationtypesAzureIntegrationConfigDTO {
	/**
	 * @type string
	 */
	deploymentRegion: string;
	/**
	 * @type array
	 */
	resourceGroups: string[];
	/**
	 * @type array
	 */
	telemetryCollectionStrategy: CloudintegrationtypesAzureTelemetryCollectionStrategyDTO[];
}
