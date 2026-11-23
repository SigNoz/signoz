/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';
import type { TimeDurationDTO } from './timeDurationDTO';

export interface ConfigIncidentioConfigDTO {
	/**
	 * @type string
	 */
	alert_source_token?: string;
	/**
	 * @type string
	 */
	alert_source_token_file?: string;
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
	url?: ConfigURLType2DTO;
	/**
	 * @type string
	 */
	url_file?: string;
}
