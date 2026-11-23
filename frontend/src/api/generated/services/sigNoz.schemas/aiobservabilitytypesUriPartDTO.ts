/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesUriPartDTOType } from './aiobservabilitytypesUriPartDTOType';

export interface AiobservabilitytypesUriPartDTO {
	/**
	 * @type string,null
	 */
	mime_type?: string | null;
	/**
	 * @type string
	 */
	modality: string;
	/**
	 * @type string
	 * @enum uri
	 */
	type: AiobservabilitytypesUriPartDTOType;
	/**
	 * @type string
	 */
	uri: string;
}
