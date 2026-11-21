/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigDurationDTO } from './configDurationDTO';
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';

export interface ConfigPushoverConfigDTO {
	/**
	 * @type string
	 */
	device?: string;
	expire?: ConfigDurationDTO;
	/**
	 * @type boolean
	 */
	html?: boolean;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type boolean
	 */
	monospace?: boolean;
	/**
	 * @type string
	 */
	priority?: string;
	retry?: ConfigDurationDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	sound?: string;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	token?: string;
	/**
	 * @type string
	 */
	token_file?: string;
	ttl?: ConfigDurationDTO;
	/**
	 * @type string
	 */
	url?: string;
	/**
	 * @type string
	 */
	url_title?: string;
	/**
	 * @type string
	 */
	user_key?: string;
	/**
	 * @type string
	 */
	user_key_file?: string;
}
