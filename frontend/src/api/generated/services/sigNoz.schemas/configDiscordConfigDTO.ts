/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigSecretURLDTO } from './configSecretURLDTO';

export interface ConfigDiscordConfigDTO {
	/**
	 * @type string
	 */
	avatar_url?: string;
	/**
	 * @type string
	 */
	content?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	username?: string;
	webhook_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	webhook_url_file?: string;
}
