/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAWSAccountConfigDTO } from './cloudintegrationtypesAWSAccountConfigDTO';
import type { CloudintegrationtypesAzureAccountConfigDTO } from './cloudintegrationtypesAzureAccountConfigDTO';
import type { CloudintegrationtypesGCPAccountConfigDTO } from './cloudintegrationtypesGCPAccountConfigDTO';

export interface CloudintegrationtypesAccountConfigDTO {
	aws?: CloudintegrationtypesAWSAccountConfigDTO;
	azure?: CloudintegrationtypesAzureAccountConfigDTO;
	gcp?: CloudintegrationtypesGCPAccountConfigDTO;
}
