/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesFilePartDTOType } from './aiobservabilitytypesFilePartDTOType';

export interface AiobservabilitytypesFilePartDTO {
	/**
	 * @type string
	 */
	file_id: string;
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
	 * @enum file
	 */
	type: AiobservabilitytypesFilePartDTOType;
}
