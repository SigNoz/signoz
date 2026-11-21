/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigSecretURLDTO } from './configSecretURLDTO';

export interface ConfigMSTeamsV2ConfigDTO {
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	title?: string;
	webhook_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	webhook_url_file?: string;
}
