/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigSecretURLDTO } from './configSecretURLDTO';

export interface AlertmanagertypesGoogleChatReceiverConfigDTO {
	/**
	 * @description HTTP client settings for the webhook call.
	 */
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 * @description Alertmanager template for the message body.
	 */
	text?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the message title.
	 */
	title?: string;
	/**
	 * @description The Google Chat space webhook URL.
	 */
	webhook_url?: ConfigSecretURLDTO;
}
