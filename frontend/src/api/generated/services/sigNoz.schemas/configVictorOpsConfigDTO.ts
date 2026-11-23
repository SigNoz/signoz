/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';
import type { ConfigVictorOpsConfigDTOCustomFields } from './configVictorOpsConfigDTOCustomFields';

export interface ConfigVictorOpsConfigDTO {
	/**
	 * @type string
	 */
	api_key?: string;
	/**
	 * @type string
	 */
	api_key_file?: string;
	api_url?: ConfigURLType2DTO;
	/**
	 * @type object
	 */
	custom_fields?: ConfigVictorOpsConfigDTOCustomFields;
	/**
	 * @type string
	 */
	entity_display_name?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message_type?: string;
	/**
	 * @type string
	 */
	monitoring_tool?: string;
	/**
	 * @type string
	 */
	routing_key?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	state_message?: string;
}
