/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';

export interface ConfigWechatConfigDTO {
	/**
	 * @type string
	 */
	agent_id?: string;
	/**
	 * @type string
	 */
	api_secret?: string;
	/**
	 * @type string
	 */
	api_secret_file?: string;
	api_url?: ConfigURLType2DTO;
	/**
	 * @type string
	 */
	corp_id?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	message_type?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	to_party?: string;
	/**
	 * @type string
	 */
	to_tag?: string;
	/**
	 * @type string
	 */
	to_user?: string;
}
