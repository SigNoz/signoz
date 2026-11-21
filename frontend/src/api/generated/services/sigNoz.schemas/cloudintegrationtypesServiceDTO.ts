/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesCloudIntegrationServiceDTO } from './cloudintegrationtypesCloudIntegrationServiceDTO';
import type { CloudintegrationtypesDataCollectedDTO } from './cloudintegrationtypesDataCollectedDTO';
import type { CloudintegrationtypesServiceAssetsDTO } from './cloudintegrationtypesServiceAssetsDTO';
import type { CloudintegrationtypesSupportedSignalsDTO } from './cloudintegrationtypesSupportedSignalsDTO';

export interface CloudintegrationtypesServiceDTO {
	assets: CloudintegrationtypesServiceAssetsDTO;
	cloudIntegrationService: CloudintegrationtypesCloudIntegrationServiceDTO | null;
	dataCollected: CloudintegrationtypesDataCollectedDTO;
	/**
	 * @type string
	 */
	icon: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	overview: string;
	supportedSignals: CloudintegrationtypesSupportedSignalsDTO;
	/**
	 * @type string
	 */
	title: string;
}
