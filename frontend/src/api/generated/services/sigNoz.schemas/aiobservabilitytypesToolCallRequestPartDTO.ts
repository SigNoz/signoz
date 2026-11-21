/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesToolCallRequestPartDTOType } from './aiobservabilitytypesToolCallRequestPartDTOType';

export interface AiobservabilitytypesToolCallRequestPartDTO {
	arguments?: unknown;
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 * @enum tool_call
	 */
	type: AiobservabilitytypesToolCallRequestPartDTOType;
}
