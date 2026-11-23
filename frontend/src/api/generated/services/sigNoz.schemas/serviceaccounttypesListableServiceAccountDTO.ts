/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ServiceaccounttypesDSLKeyDTO } from './serviceaccounttypesDSLKeyDTO';
import type { ServiceaccounttypesServiceAccountDTO } from './serviceaccounttypesServiceAccountDTO';

export interface ServiceaccounttypesListableServiceAccountDTO {
	/**
	 * @type array
	 * @description The filter keys the query accepts.
	 */
	reservedKeywords: ServiceaccounttypesDSLKeyDTO[];
	/**
	 * @type array
	 * @description The service accounts on this page.
	 */
	serviceAccounts: ServiceaccounttypesServiceAccountDTO[];
	/**
	 * @type integer
	 * @format int64
	 * @description The number of service accounts the filter matches across all pages.
	 */
	total: number;
}
