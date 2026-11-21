/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesTransactionGroupsDTO } from './authtypesTransactionGroupsDTO';

export interface AuthtypesRoleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	description: string;
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
	transactionGroups: AuthtypesTransactionGroupsDTO;
	/**
	 * @type string
	 */
	type: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}
