/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesPartsDTO } from './aiobservabilitytypesPartsDTO';

export interface AiobservabilitytypesChatMessageDTO {
	/**
	 * @type string,null
	 */
	name?: string | null;
	parts: AiobservabilitytypesPartsDTO;
	/**
	 * @type string
	 */
	role: string;
}
