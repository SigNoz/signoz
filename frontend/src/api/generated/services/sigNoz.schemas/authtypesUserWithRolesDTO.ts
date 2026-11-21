/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesUserRoleDTO } from './authtypesUserRoleDTO';

export interface AuthtypesUserWithRolesDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	displayName?: string;
	/**
	 * @type string
	 */
	email?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type boolean
	 */
	isRoot?: boolean;
	/**
	 * @type string
	 */
	orgId?: string;
	/**
	 * @type string
	 */
	status?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type array,null
	 */
	userRoles?: AuthtypesUserRoleDTO[] | null;
}
