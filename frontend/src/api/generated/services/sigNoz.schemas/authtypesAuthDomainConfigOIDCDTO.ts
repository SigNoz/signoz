/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAuthDomainConfigOIDCDTOKind } from './authtypesAuthDomainConfigOIDCDTOKind';
import type { AuthtypesOIDCConfigDTO } from './authtypesOIDCConfigDTO';

export interface AuthtypesAuthDomainConfigOIDCDTO {
	/**
	 * @type string
	 * @enum oidc
	 * @description The kind of authn provider.
	 */
	kind: AuthtypesAuthDomainConfigOIDCDTOKind;
	/**
	 * @description The oidc configuration.
	 */
	spec: AuthtypesOIDCConfigDTO;
}
