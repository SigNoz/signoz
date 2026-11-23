/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAzureServiceLogsConfigDTO } from './cloudintegrationtypesAzureServiceLogsConfigDTO';
import type { CloudintegrationtypesAzureServiceMetricsConfigDTO } from './cloudintegrationtypesAzureServiceMetricsConfigDTO';

export interface CloudintegrationtypesAzureServiceConfigDTO {
	logs: CloudintegrationtypesAzureServiceLogsConfigDTO;
	metrics: CloudintegrationtypesAzureServiceMetricsConfigDTO;
}
