/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ServiceaccounttypesServiceAccountRoleDTO } from './serviceaccounttypesServiceAccountRoleDTO';
import type { ServiceaccounttypesServiceAccountStatusDTO } from './serviceaccounttypesServiceAccountStatusDTO';

export interface ServiceaccounttypesServiceAccountWithRolesDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string
	 */
	email: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type array,null
	 */
	serviceAccountRoles: ServiceaccounttypesServiceAccountRoleDTO[] | null;
	status: ServiceaccounttypesServiceAccountStatusDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
}
