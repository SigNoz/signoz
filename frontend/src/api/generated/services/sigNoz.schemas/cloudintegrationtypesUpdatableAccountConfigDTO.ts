/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAWSAccountConfigDTO } from './cloudintegrationtypesAWSAccountConfigDTO';
import type { CloudintegrationtypesUpdatableAzureAccountConfigDTO } from './cloudintegrationtypesUpdatableAzureAccountConfigDTO';
import type { CloudintegrationtypesUpdatableGCPAccountConfigDTO } from './cloudintegrationtypesUpdatableGCPAccountConfigDTO';

export interface CloudintegrationtypesUpdatableAccountConfigDTO {
	aws?: CloudintegrationtypesAWSAccountConfigDTO;
	azure?: CloudintegrationtypesUpdatableAzureAccountConfigDTO;
	gcp?: CloudintegrationtypesUpdatableGCPAccountConfigDTO;
}
