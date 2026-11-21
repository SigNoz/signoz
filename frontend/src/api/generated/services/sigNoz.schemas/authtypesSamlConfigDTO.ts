/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AuthtypesAttributeMappingDTO } from './authtypesAttributeMappingDTO';

export interface AuthtypesSamlConfigDTO {
	attributeMapping?: AuthtypesAttributeMappingDTO;
	/**
	 * @type string
	 */
	certificate: string;
	/**
	 * @type string
	 */
	entityId: string;
	/**
	 * @type boolean
	 */
	insecureSkipAuthNRequestsSigned?: boolean;
	/**
	 * @type string
	 */
	location: string;
}
