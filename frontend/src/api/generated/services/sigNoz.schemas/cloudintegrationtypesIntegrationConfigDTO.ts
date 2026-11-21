/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesOldAWSCollectionStrategyDTO } from './cloudintegrationtypesOldAWSCollectionStrategyDTO';

/**
 * @nullable
 */
export type CloudintegrationtypesIntegrationConfigDTO = {
	/**
	 * @type array
	 */
	enabled_regions: string[];
	telemetry: CloudintegrationtypesOldAWSCollectionStrategyDTO;
} | null;
