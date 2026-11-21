/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigOpsGenieConfigDTODetails } from './configOpsGenieConfigDTODetails';
import type { ConfigOpsGenieConfigResponderDTO } from './configOpsGenieConfigResponderDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';

export interface ConfigOpsGenieConfigDTO {
	/**
	 * @type string
	 */
	actions?: string;
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
	 * @type string
	 */
	description?: string;
	/**
	 * @type object
	 */
	details?: ConfigOpsGenieConfigDTODetails;
	/**
	 * @type string
	 */
	entity?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	note?: string;
	/**
	 * @type string
	 */
	priority?: string;
	/**
	 * @type array
	 */
	responders?: ConfigOpsGenieConfigResponderDTO[];
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	source?: string;
	/**
	 * @type string
	 */
	tags?: string;
	/**
	 * @type boolean
	 */
	update_alerts?: boolean;
}
