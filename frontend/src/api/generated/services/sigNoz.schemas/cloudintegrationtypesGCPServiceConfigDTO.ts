/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesGCPServiceLogsConfigDTO } from './cloudintegrationtypesGCPServiceLogsConfigDTO';
import type { CloudintegrationtypesGCPServiceMetricsConfigDTO } from './cloudintegrationtypesGCPServiceMetricsConfigDTO';

export interface CloudintegrationtypesGCPServiceConfigDTO {
	logs?: CloudintegrationtypesGCPServiceLogsConfigDTO;
	metrics?: CloudintegrationtypesGCPServiceMetricsConfigDTO;
}
