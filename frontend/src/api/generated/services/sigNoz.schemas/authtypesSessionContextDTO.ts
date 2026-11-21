/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesOrgSessionContextDTO } from './authtypesOrgSessionContextDTO';

export interface AuthtypesSessionContextDTO {
	/**
	 * @type boolean
	 */
	exists?: boolean;
	/**
	 * @type array,null
	 */
	orgs?: AuthtypesOrgSessionContextDTO[] | null;
}
