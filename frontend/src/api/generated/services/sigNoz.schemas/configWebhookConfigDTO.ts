/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { TimeDurationDTO } from './timeDurationDTO';

export interface ConfigWebhookConfigDTO {
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type integer
	 * @minimum 0
	 */
	max_alerts?: number;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	timeout?: TimeDurationDTO;
	/**
	 * @type string
	 */
	url?: string;
	/**
	 * @type string
	 */
	url_file?: string;
}
