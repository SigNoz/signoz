/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesOldAWSCollectionStrategyDTOS3Buckets } from './cloudintegrationtypesOldAWSCollectionStrategyDTOS3Buckets';
import type { CloudintegrationtypesOldAWSLogsStrategyDTO } from './cloudintegrationtypesOldAWSLogsStrategyDTO';
import type { CloudintegrationtypesOldAWSMetricsStrategyDTO } from './cloudintegrationtypesOldAWSMetricsStrategyDTO';

export interface CloudintegrationtypesOldAWSCollectionStrategyDTO {
	aws_logs?: CloudintegrationtypesOldAWSLogsStrategyDTO;
	aws_metrics?: CloudintegrationtypesOldAWSMetricsStrategyDTO;
	/**
	 * @type string
	 */
	provider?: string;
	/**
	 * @type object
	 */
	s3_buckets?: CloudintegrationtypesOldAWSCollectionStrategyDTOS3Buckets;
}
