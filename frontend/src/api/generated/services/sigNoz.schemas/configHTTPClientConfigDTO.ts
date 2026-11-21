/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigAuthorizationDTO } from './configAuthorizationDTO';
import type { ConfigBasicAuthDTO } from './configBasicAuthDTO';
import type { ConfigHeadersDTO } from './configHeadersDTO';
import type { ConfigOAuth2DTO } from './configOAuth2DTO';
import type { ConfigProxyHeaderDTO } from './configProxyHeaderDTO';
import type { ConfigTLSConfigDTO } from './configTLSConfigDTO';
import type { ConfigURLDTO } from './configURLDTO';

export interface ConfigHTTPClientConfigDTO {
	authorization?: ConfigAuthorizationDTO;
	basic_auth?: ConfigBasicAuthDTO;
	/**
	 * @type string
	 */
	bearer_token?: string;
	/**
	 * @type string
	 */
	bearer_token_file?: string;
	/**
	 * @type boolean
	 */
	enable_http2?: boolean;
	/**
	 * @type boolean
	 */
	follow_redirects?: boolean;
	http_headers?: ConfigHeadersDTO;
	/**
	 * @type string
	 */
	no_proxy?: string;
	oauth2?: ConfigOAuth2DTO;
	proxy_connect_header?: ConfigProxyHeaderDTO;
	/**
	 * @type boolean
	 */
	proxy_from_environment?: boolean;
	proxy_url?: ConfigURLDTO;
	tls_config?: ConfigTLSConfigDTO;
}
