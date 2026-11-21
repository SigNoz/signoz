/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';

export interface ConfigWebexConfigDTO {
	api_url?: ConfigURLType2DTO;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	room_id?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
}
