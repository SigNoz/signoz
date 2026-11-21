/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAWSPostableAccountConfigDTO } from './cloudintegrationtypesAWSPostableAccountConfigDTO';
import type { CloudintegrationtypesAzureAccountConfigDTO } from './cloudintegrationtypesAzureAccountConfigDTO';
import type { CloudintegrationtypesGCPPostableAccountConfigDTO } from './cloudintegrationtypesGCPPostableAccountConfigDTO';

export interface CloudintegrationtypesPostableAccountConfigDTO {
	aws?: CloudintegrationtypesAWSPostableAccountConfigDTO;
	azure?: CloudintegrationtypesAzureAccountConfigDTO;
	gcp?: CloudintegrationtypesGCPPostableAccountConfigDTO;
}
