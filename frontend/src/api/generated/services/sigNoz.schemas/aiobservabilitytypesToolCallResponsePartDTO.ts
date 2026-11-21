/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesToolCallResponsePartDTOResponse } from './aiobservabilitytypesToolCallResponsePartDTOResponse';
import type { AiobservabilitytypesToolCallResponsePartDTOType } from './aiobservabilitytypesToolCallResponsePartDTOType';

export interface AiobservabilitytypesToolCallResponsePartDTO {
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @nullable true
	 */
	response: AiobservabilitytypesToolCallResponsePartDTOResponse;
	/**
	 * @type string
	 * @enum tool_call_response
	 */
	type: AiobservabilitytypesToolCallResponsePartDTOType;
}
