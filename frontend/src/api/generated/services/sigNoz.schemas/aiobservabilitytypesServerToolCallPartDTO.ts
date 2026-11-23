/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesGenericServerToolCallDTO } from './aiobservabilitytypesGenericServerToolCallDTO';
import type { AiobservabilitytypesServerToolCallPartDTOType } from './aiobservabilitytypesServerToolCallPartDTOType';

export interface AiobservabilitytypesServerToolCallPartDTO {
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @type string
	 */
	name: string;
	server_tool_call: AiobservabilitytypesGenericServerToolCallDTO;
	/**
	 * @type string
	 * @enum server_tool_call
	 */
	type: AiobservabilitytypesServerToolCallPartDTOType;
}
