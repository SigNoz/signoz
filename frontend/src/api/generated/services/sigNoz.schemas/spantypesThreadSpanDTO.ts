/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AiobservabilitytypesInputMessagesDTO } from './aiobservabilitytypesInputMessagesDTO';
import type { AiobservabilitytypesOutputMessagesDTO } from './aiobservabilitytypesOutputMessagesDTO';
import type { SpantypesEventDTO } from './spantypesEventDTO';
import type { SpantypesOtelSpanRefDTO } from './spantypesOtelSpanRefDTO';
import type { SpantypesThreadSpanDTOAttributes } from './spantypesThreadSpanDTOAttributes';
import type { SpantypesThreadSpanDTOResource } from './spantypesThreadSpanDTOResource';

export interface SpantypesThreadSpanDTO {
	/**
	 * @type object
	 */
	attributes: SpantypesThreadSpanDTOAttributes;
	/**
	 * @type integer
	 * @minimum 0
	 */
	duration_nano: number;
	/**
	 * @type array
	 */
	events: SpantypesEventDTO[];
	formattedInput: AiobservabilitytypesInputMessagesDTO;
	formattedOutput: AiobservabilitytypesOutputMessagesDTO;
	/**
	 * @type array
	 */
	formatterWarnings: string[];
	/**
	 * @type boolean
	 */
	has_error: boolean;
	/**
	 * @type string
	 */
	kind_string: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	parent_span_id: string;
	/**
	 * @type array
	 */
	references: SpantypesOtelSpanRefDTO[];
	/**
	 * @type object
	 */
	resource: SpantypesThreadSpanDTOResource;
	/**
	 * @type string
	 */
	span_id: string;
	/**
	 * @type string
	 */
	status_code_string: string;
	/**
	 * @type string
	 */
	status_message: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	time_unix: number;
	/**
	 * @type string
	 */
	trace_id: string;
}
