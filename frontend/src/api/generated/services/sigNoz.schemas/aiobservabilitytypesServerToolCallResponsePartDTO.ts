/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesGenericServerToolCallResponseDTO } from './aiobservabilitytypesGenericServerToolCallResponseDTO';
import type { AiobservabilitytypesServerToolCallResponsePartDTOType } from './aiobservabilitytypesServerToolCallResponsePartDTOType';

export interface AiobservabilitytypesServerToolCallResponsePartDTO {
	/**
	 * @type string,null
	 */
	id?: string | null;
	server_tool_call_response: AiobservabilitytypesGenericServerToolCallResponseDTO;
	/**
	 * @type string
	 * @enum server_tool_call_response
	 */
	type: AiobservabilitytypesServerToolCallResponsePartDTOType;
}
