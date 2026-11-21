/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAuthDomainConfigGoogleDTOKind } from './authtypesAuthDomainConfigGoogleDTOKind';
import type { AuthtypesGoogleConfigDTO } from './authtypesGoogleConfigDTO';

export interface AuthtypesAuthDomainConfigGoogleDTO {
	/**
	 * @type string
	 * @enum google
	 * @description The kind of authn provider.
	 */
	kind: AuthtypesAuthDomainConfigGoogleDTOKind;
	/**
	 * @description The google auth configuration.
	 */
	spec: AuthtypesGoogleConfigDTO;
}
