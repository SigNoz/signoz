/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesTransactionGroupsDTO } from './authtypesTransactionGroupsDTO';

export interface AuthtypesPostableRoleDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name: string;
	transactionGroups?: AuthtypesTransactionGroupsDTO;
}
