/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAWSServiceConfigDTO } from './cloudintegrationtypesAWSServiceConfigDTO';
import type { CloudintegrationtypesAzureServiceConfigDTO } from './cloudintegrationtypesAzureServiceConfigDTO';
import type { CloudintegrationtypesGCPServiceConfigDTO } from './cloudintegrationtypesGCPServiceConfigDTO';

export interface CloudintegrationtypesServiceConfigDTO {
	aws?: CloudintegrationtypesAWSServiceConfigDTO;
	azure?: CloudintegrationtypesAzureServiceConfigDTO;
	gcp?: CloudintegrationtypesGCPServiceConfigDTO;
}
