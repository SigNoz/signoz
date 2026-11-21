/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesRoleDTO } from './authtypesRoleDTO';

export interface AuthtypesUserRoleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string
	 */
	id: string;
	role: AuthtypesRoleDTO;
	/**
	 * @type string
	 */
	roleId: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
	/**
	 * @type string
	 */
	userId: string;
}
