/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAuthDomainConfigDTO } from './authtypesAuthDomainConfigDTO';
import type { AuthtypesRoleMappingDTO } from './authtypesRoleMappingDTO';

export interface AuthtypesPostableAuthDomainDTO {
	config: AuthtypesAuthDomainConfigDTO;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type string
	 */
	name: string;
	roleMapping?: AuthtypesRoleMappingDTO;
}
