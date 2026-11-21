/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAuthNSupportDTO } from './authtypesAuthNSupportDTO';
import type { ErrorsJSONDTO } from './errorsJSONDTO';

export interface AuthtypesOrgSessionContextDTO {
	authNSupport?: AuthtypesAuthNSupportDTO;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type string
	 */
	name?: string;
	warning?: ErrorsJSONDTO;
}
