/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesGCPLogsCollectionStrategyDTO } from './cloudintegrationtypesGCPLogsCollectionStrategyDTO';
import type { CloudintegrationtypesGCPMetricsCollectionStrategyDTO } from './cloudintegrationtypesGCPMetricsCollectionStrategyDTO';

export interface CloudintegrationtypesGCPTelemetryCollectionStrategyDTO {
	logs: CloudintegrationtypesGCPLogsCollectionStrategyDTO | null;
	metrics: CloudintegrationtypesGCPMetricsCollectionStrategyDTO | null;
}
