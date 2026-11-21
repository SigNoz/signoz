/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigSNSConfigDTOAttributes } from './configSNSConfigDTOAttributes';
import type { Sigv4SigV4ConfigDTO } from './sigv4SigV4ConfigDTO';

export interface ConfigSNSConfigDTO {
	/**
	 * @type string
	 */
	api_url?: string;
	/**
	 * @type object
	 */
	attributes?: ConfigSNSConfigDTOAttributes;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	phone_number?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	sigv4?: Sigv4SigV4ConfigDTO;
	/**
	 * @type string
	 */
	subject?: string;
	/**
	 * @type string
	 */
	target_arn?: string;
	/**
	 * @type string
	 */
	topic_arn?: string;
}
