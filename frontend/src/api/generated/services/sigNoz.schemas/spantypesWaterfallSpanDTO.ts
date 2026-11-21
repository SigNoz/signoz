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
import type { SpantypesScopeDTO } from './spantypesScopeDTO';
import type { SpantypesWaterfallSpanDTOAttributes } from './spantypesWaterfallSpanDTOAttributes';
import type { SpantypesWaterfallSpanDTOResource } from './spantypesWaterfallSpanDTOResource';

export interface SpantypesWaterfallSpanDTO {
	/**
	 * @type object,null
	 */
	attributes?: SpantypesWaterfallSpanDTOAttributes;
	/**
	 * @type string
	 */
	db_name?: string;
	/**
	 * @type string
	 */
	db_operation?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	duration_nano?: number;
	/**
	 * @type array,null
	 */
	events?: SpantypesEventDTO[] | null;
	/**
	 * @type string
	 */
	external_http_method?: string;
	/**
	 * @type string
	 */
	external_http_url?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	flags?: number;
	formattedInput?: AiobservabilitytypesInputMessagesDTO;
	formattedOutput?: AiobservabilitytypesOutputMessagesDTO;
	/**
	 * @type array
	 */
	formatterWarnings?: string[];
	/**
	 * @type boolean
	 */
	has_children?: boolean;
	/**
	 * @type boolean
	 */
	has_error?: boolean;
	/**
	 * @type string
	 */
	http_host?: string;
	/**
	 * @type string
	 */
	http_method?: string;
	/**
	 * @type string
	 */
	http_url?: string;
	/**
	 * @type string
	 */
	is_remote?: string;
	/**
	 * @type string
	 */
	kind_string?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	level?: number;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	parent_span_id?: string;
	/**
	 * @type array
	 */
	references: SpantypesOtelSpanRefDTO[];
	/**
	 * @type object,null
	 */
	resource?: SpantypesWaterfallSpanDTOResource;
	/**
	 * @type string
	 */
	response_status_code?: string;
	scope?: SpantypesScopeDTO;
	/**
	 * @type string
	 */
	span_id?: string;
	/**
	 * @type integer
	 */
	status_code?: number;
	/**
	 * @type string
	 */
	status_code_string?: string;
	/**
	 * @type string
	 */
	status_message?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	sub_tree_node_count?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	time_unix?: number;
	/**
	 * @type string
	 */
	trace_id?: string;
	/**
	 * @type string
	 */
	trace_state?: string;
}
