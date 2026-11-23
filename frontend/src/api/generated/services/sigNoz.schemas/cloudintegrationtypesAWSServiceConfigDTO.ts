/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAWSServiceLogsConfigDTO } from './cloudintegrationtypesAWSServiceLogsConfigDTO';
import type { CloudintegrationtypesAWSServiceMetricsConfigDTO } from './cloudintegrationtypesAWSServiceMetricsConfigDTO';

export interface CloudintegrationtypesAWSServiceConfigDTO {
	logs?: CloudintegrationtypesAWSServiceLogsConfigDTO;
	metrics?: CloudintegrationtypesAWSServiceMetricsConfigDTO;
}
