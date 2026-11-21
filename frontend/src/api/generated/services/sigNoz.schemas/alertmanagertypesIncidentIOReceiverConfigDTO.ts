/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesIncidentIOReceiverConfigDTOMetadata } from './alertmanagertypesIncidentIOReceiverConfigDTOMetadata';
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';

export interface AlertmanagertypesIncidentIOReceiverConfigDTO {
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
	 * @type object
	 * @description Extra event metadata keyed by name, merged over the group's common labels; values are Alertmanager templates.
	 */
	metadata?: AlertmanagertypesIncidentIOReceiverConfigDTOMetadata;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 * @description Alertmanager template for the alert title.
	 */
	title?: string;
	/**
	 * @type string
	 * @description The alert source secret token, without the Bearer prefix.
	 */
	token?: string;
	/**
	 * @type string
	 * @description The alert source HTTP alert events endpoint.
	 */
	url?: string;
}
