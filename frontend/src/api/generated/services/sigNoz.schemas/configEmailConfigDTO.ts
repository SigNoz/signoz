/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigEmailConfigDTOHeaders } from './configEmailConfigDTOHeaders';
import type { ConfigHostPortDTO } from './configHostPortDTO';
import type { ConfigThreadingConfigDTO } from './configThreadingConfigDTO';
import type { ConfigTLSConfigDTO } from './configTLSConfigDTO';

export interface ConfigEmailConfigDTO {
	/**
	 * @type string
	 */
	auth_identity?: string;
	/**
	 * @type string
	 */
	auth_password?: string;
	/**
	 * @type string
	 */
	auth_password_file?: string;
	/**
	 * @type string
	 */
	auth_secret?: string;
	/**
	 * @type string
	 */
	auth_secret_file?: string;
	/**
	 * @type string
	 */
	auth_username?: string;
	/**
	 * @type boolean,null
	 */
	force_implicit_tls?: boolean | null;
	/**
	 * @type string
	 */
	from?: string;
	/**
	 * @type object
	 */
	headers?: ConfigEmailConfigDTOHeaders;
	/**
	 * @type string
	 */
	hello?: string;
	/**
	 * @type string
	 */
	html?: string;
	/**
	 * @type boolean,null
	 */
	require_tls?: boolean | null;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	smarthost?: ConfigHostPortDTO;
	/**
	 * @type string
	 */
	text?: string;
	threading?: ConfigThreadingConfigDTO;
	tls_config?: ConfigTLSConfigDTO;
	/**
	 * @type string
	 */
	to?: string;
}
