/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesDeprecatedPostableUserRoleDTO } from './authtypesDeprecatedPostableUserRoleDTO';

export interface AuthtypesPostableUserDTO {
	/**
	 * @type string
	 */
	displayName?: string;
	/**
	 * @type string
	 */
	email: string;
	/**
	 * @type string
	 */
	frontendBaseUrl?: string;
	/**
	 * @type array
	 */
	userRoles?: AuthtypesDeprecatedPostableUserRoleDTO[];
}
