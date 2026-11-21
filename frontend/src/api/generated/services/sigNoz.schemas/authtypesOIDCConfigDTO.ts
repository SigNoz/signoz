/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAttributeMappingDTO } from './authtypesAttributeMappingDTO';

export interface AuthtypesOIDCConfigDTO {
	claimMapping?: AuthtypesAttributeMappingDTO;
	/**
	 * @type string
	 */
	clientId: string;
	/**
	 * @type string
	 * @format password
	 */
	clientSecret: string;
	/**
	 * @type boolean
	 */
	getUserInfo?: boolean;
	/**
	 * @type boolean
	 */
	insecureSkipEmailVerified?: boolean;
	/**
	 * @type string
	 */
	issuer: string;
	/**
	 * @type string
	 */
	issuerAlias?: string;
}
