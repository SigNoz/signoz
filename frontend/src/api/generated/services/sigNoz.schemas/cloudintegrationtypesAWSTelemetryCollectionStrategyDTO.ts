/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAWSLogsCollectionStrategyDTO } from './cloudintegrationtypesAWSLogsCollectionStrategyDTO';
import type { CloudintegrationtypesAWSMetricsCollectionStrategyDTO } from './cloudintegrationtypesAWSMetricsCollectionStrategyDTO';
import type { CloudintegrationtypesAWSTelemetryCollectionStrategyDTOS3Buckets } from './cloudintegrationtypesAWSTelemetryCollectionStrategyDTOS3Buckets';

export interface CloudintegrationtypesAWSTelemetryCollectionStrategyDTO {
	logs?: CloudintegrationtypesAWSLogsCollectionStrategyDTO;
	metrics?: CloudintegrationtypesAWSMetricsCollectionStrategyDTO;
	/**
	 * @type object
	 */
	s3Buckets?: CloudintegrationtypesAWSTelemetryCollectionStrategyDTOS3Buckets;
}
