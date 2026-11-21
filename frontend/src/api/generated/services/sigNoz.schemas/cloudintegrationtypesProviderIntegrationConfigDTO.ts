/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAWSIntegrationConfigDTO } from './cloudintegrationtypesAWSIntegrationConfigDTO';
import type { CloudintegrationtypesAzureIntegrationConfigDTO } from './cloudintegrationtypesAzureIntegrationConfigDTO';
import type { CloudintegrationtypesGCPIntegrationConfigDTO } from './cloudintegrationtypesGCPIntegrationConfigDTO';

export interface CloudintegrationtypesProviderIntegrationConfigDTO {
	aws?: CloudintegrationtypesAWSIntegrationConfigDTO;
	azure?: CloudintegrationtypesAzureIntegrationConfigDTO;
	gcp?: CloudintegrationtypesGCPIntegrationConfigDTO;
}
