/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAWSConnectionArtifactDTO } from './cloudintegrationtypesAWSConnectionArtifactDTO';
import type { CloudintegrationtypesAzureConnectionArtifactDTO } from './cloudintegrationtypesAzureConnectionArtifactDTO';
import type { CloudintegrationtypesGCPConnectionArtifactDTO } from './cloudintegrationtypesGCPConnectionArtifactDTO';

export interface CloudintegrationtypesConnectionArtifactDTO {
	aws?: CloudintegrationtypesAWSConnectionArtifactDTO;
	azure?: CloudintegrationtypesAzureConnectionArtifactDTO;
	gcp?: CloudintegrationtypesGCPConnectionArtifactDTO;
}
