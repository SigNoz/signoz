/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { FactoryResponseDTOServices } from './factoryResponseDTOServices';

export interface FactoryResponseDTO {
	/**
	 * @type boolean
	 */
	healthy?: boolean;
	/**
	 * @type object,null
	 */
	services?: FactoryResponseDTOServices;
}
