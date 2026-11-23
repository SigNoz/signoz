/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigPagerdutyConfigDTODetails } from './configPagerdutyConfigDTODetails';
import type { ConfigPagerdutyImageDTO } from './configPagerdutyImageDTO';
import type { ConfigPagerdutyLinkDTO } from './configPagerdutyLinkDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';
import type { TimeDurationDTO } from './timeDurationDTO';

export interface ConfigPagerdutyConfigDTO {
	/**
	 * @type string
	 */
	class?: string;
	/**
	 * @type string
	 */
	client?: string;
	/**
	 * @type string
	 */
	client_url?: string;
	/**
	 * @type string
	 */
	component?: string;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type object
	 */
	details?: ConfigPagerdutyConfigDTODetails;
	/**
	 * @type string
	 */
	group?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type array
	 */
	images?: ConfigPagerdutyImageDTO[];
	/**
	 * @type array
	 */
	links?: ConfigPagerdutyLinkDTO[];
	/**
	 * @type string
	 */
	routing_key?: string;
	/**
	 * @type string
	 */
	routing_key_file?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	service_key?: string;
	/**
	 * @type string
	 */
	service_key_file?: string;
	/**
	 * @type string
	 */
	severity?: string;
	/**
	 * @type string
	 */
	source?: string;
	timeout?: TimeDurationDTO;
	url?: ConfigURLType2DTO;
}
