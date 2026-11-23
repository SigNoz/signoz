/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAuthDomainConfigGoogleDTO } from './authtypesAuthDomainConfigGoogleDTO';
import type { AuthtypesAuthDomainConfigOIDCDTO } from './authtypesAuthDomainConfigOIDCDTO';
import type { AuthtypesAuthDomainConfigSAMLDTO } from './authtypesAuthDomainConfigSAMLDTO';

export type AuthtypesAuthDomainConfigDTO =
	| AuthtypesAuthDomainConfigSAMLDTO
	| AuthtypesAuthDomainConfigGoogleDTO
	| AuthtypesAuthDomainConfigOIDCDTO;
