/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface ConfigTLSConfigDTO {
	/**
	 * @type string
	 */
	ca?: string;
	/**
	 * @type string
	 */
	ca_file?: string;
	/**
	 * @type string
	 */
	ca_ref?: string;
	/**
	 * @type string
	 */
	cert?: string;
	/**
	 * @type string
	 */
	cert_file?: string;
	/**
	 * @type string
	 */
	cert_ref?: string;
	/**
	 * @type boolean
	 */
	insecure_skip_verify?: boolean;
	/**
	 * @type string
	 */
	key?: string;
	/**
	 * @type string
	 */
	key_file?: string;
	/**
	 * @type string
	 */
	key_ref?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	max_version?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	min_version?: number;
	/**
	 * @type string
	 */
	server_name?: string;
}
