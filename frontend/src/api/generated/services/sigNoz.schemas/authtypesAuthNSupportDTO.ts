/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesCallbackAuthNSupportDTO } from './authtypesCallbackAuthNSupportDTO';
import type { AuthtypesPasswordAuthNSupportDTO } from './authtypesPasswordAuthNSupportDTO';

export interface AuthtypesAuthNSupportDTO {
	/**
	 * @type array,null
	 */
	callback?: AuthtypesCallbackAuthNSupportDTO[] | null;
	/**
	 * @type array,null
	 */
	password?: AuthtypesPasswordAuthNSupportDTO[] | null;
}
