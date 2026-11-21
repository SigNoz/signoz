/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ServiceaccounttypesServiceAccountStatusDTO } from './serviceaccounttypesServiceAccountStatusDTO';

export interface ServiceaccounttypesServiceAccountDTO {
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
	status: ServiceaccounttypesServiceAccountStatusDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
}
