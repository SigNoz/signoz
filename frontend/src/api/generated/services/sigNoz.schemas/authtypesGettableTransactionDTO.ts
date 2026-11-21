/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesRelationDTO } from './authtypesRelationDTO';
import type { CoretypesObjectDTO } from './coretypesObjectDTO';

export interface AuthtypesGettableTransactionDTO {
	/**
	 * @type boolean
	 */
	authorized: boolean;
	object: CoretypesObjectDTO;
	relation: AuthtypesRelationDTO;
}
