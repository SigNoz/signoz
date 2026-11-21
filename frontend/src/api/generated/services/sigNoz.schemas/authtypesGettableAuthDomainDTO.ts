/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAuthDomainConfigDTO } from './authtypesAuthDomainConfigDTO';
import type { AuthtypesAuthNProviderInfoDTO } from './authtypesAuthNProviderInfoDTO';
import type { AuthtypesRoleMappingDTO } from './authtypesRoleMappingDTO';

export interface AuthtypesGettableAuthDomainDTO {
	authNProviderInfo?: AuthtypesAuthNProviderInfoDTO;
	config?: AuthtypesAuthDomainConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	orgId?: string;
	roleMapping?: AuthtypesRoleMappingDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}
