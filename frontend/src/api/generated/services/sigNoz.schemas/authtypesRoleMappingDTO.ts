/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesRoleMappingDTOGroupMappings } from './authtypesRoleMappingDTOGroupMappings';

export interface AuthtypesRoleMappingDTO {
	/**
	 * @type string
	 */
	defaultRole?: string;
	/**
	 * @type object,null
	 */
	groupMappings?: AuthtypesRoleMappingDTOGroupMappings;
	/**
	 * @type boolean
	 */
	useRoleAttribute?: boolean;
}
