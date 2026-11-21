/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAzureLogsCollectionStrategyDTO } from './cloudintegrationtypesAzureLogsCollectionStrategyDTO';
import type { CloudintegrationtypesAzureMetricsCollectionStrategyDTO } from './cloudintegrationtypesAzureMetricsCollectionStrategyDTO';

export interface CloudintegrationtypesAzureTelemetryCollectionStrategyDTO {
	logs?: CloudintegrationtypesAzureLogsCollectionStrategyDTO;
	metrics?: CloudintegrationtypesAzureMetricsCollectionStrategyDTO;
	/**
	 * @type string
	 */
	resourceProvider: string;
	/**
	 * @type string
	 */
	resourceType: string;
}
