/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigOAuth2DTOClaims } from './configOAuth2DTOClaims';
import type { ConfigOAuth2DTOEndpointParams } from './configOAuth2DTOEndpointParams';
import type { ConfigProxyHeaderDTO } from './configProxyHeaderDTO';
import type { ConfigURLDTO } from './configURLDTO';

export interface ConfigOAuth2DTO {
	/**
	 * @type string
	 */
	audience?: string;
	/**
	 * @type object
	 */
	claims?: ConfigOAuth2DTOClaims;
	/**
	 * @type string
	 */
	client_certificate_key?: string;
	/**
	 * @type string
	 */
	client_certificate_key_file?: string;
	/**
	 * @type string
	 */
	client_certificate_key_id?: string;
	/**
	 * @type string
	 */
	client_certificate_key_ref?: string;
	/**
	 * @type string
	 */
	client_id?: string;
	/**
	 * @type string
	 */
	client_secret?: string;
	/**
	 * @type string
	 */
	client_secret_file?: string;
	/**
	 * @type string
	 */
	client_secret_ref?: string;
	/**
	 * @type object
	 */
	endpoint_params?: ConfigOAuth2DTOEndpointParams;
	/**
	 * @type string
	 */
	grant_type?: string;
	/**
	 * @type string
	 */
	iss?: string;
	/**
	 * @type string
	 */
	no_proxy?: string;
	proxy_connect_header?: ConfigProxyHeaderDTO;
	/**
	 * @type boolean
	 */
	proxy_from_environment?: boolean;
	proxy_url?: ConfigURLDTO;
	/**
	 * @type array
	 */
	scopes?: string[];
	/**
	 * @type string
	 */
	signature_algorithm?: string;
	/**
	 * @type string
	 */
	token_url?: string;
}
