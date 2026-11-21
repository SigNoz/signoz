/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAuthDomainConfigSAMLDTOKind } from './authtypesAuthDomainConfigSAMLDTOKind';
import type { AuthtypesSamlConfigDTO } from './authtypesSamlConfigDTO';

export interface AuthtypesAuthDomainConfigSAMLDTO {
	/**
	 * @type string
	 * @enum saml
	 * @description The kind of authn provider.
	 */
	kind: AuthtypesAuthDomainConfigSAMLDTOKind;
	/**
	 * @description The saml configuration.
	 */
	spec: AuthtypesSamlConfigDTO;
}
