/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesBlobPartDTOType } from './aiobservabilitytypesBlobPartDTOType';

export interface AiobservabilitytypesBlobPartDTO {
	/**
	 * @type string
	 */
	content: string;
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
	 * @enum blob
	 */
	type: AiobservabilitytypesBlobPartDTOType;
}
