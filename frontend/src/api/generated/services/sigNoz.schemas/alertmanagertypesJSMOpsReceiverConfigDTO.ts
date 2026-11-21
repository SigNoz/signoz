/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';

export interface AlertmanagertypesJSMOpsReceiverConfigDTO {
	/**
	 * @type string
	 * @description The JSM Ops integration API key.
	 */
	api_key?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the alert description.
	 */
	description?: string;
	/**
	 * @description HTTP client settings for the API call.
	 */
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 * @description Alertmanager template for the alert message.
	 */
	message?: string;
	/**
	 * @type string
	 * @description The alert priority, P1 to P5.
	 */
	priority?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 * @description Comma-separated tags attached to the alert.
	 */
	tags?: string;
}
