/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ServiceaccounttypesServiceAccountListOrderDTO } from './serviceaccounttypesServiceAccountListOrderDTO';
import type { ServiceaccounttypesServiceAccountListSortDTO } from './serviceaccounttypesServiceAccountListSortDTO';

export type ListServiceAccountsParams = {
	/**
	 * @type string
	 * @description A filter expression over the reserved keys name, email, status, created_at and updated_at using the SigNoz filter grammar: comparisons such as =, !=, CONTAINS, LIKE, IN, < and >, single-quoted strings, RFC3339 timestamps in quotes for created_at and updated_at, combined with AND, OR and NOT, for example name CONTAINS 'ci' AND status = 'active'. A bare or quoted token without a key matches name or email case-insensitively. At most 1024 characters. Empty matches every service account.
	 */
	query?: string;
	/**
	 * @description The sort column: created_at (default), updated_at or name.
	 */
	sort?: ServiceaccounttypesServiceAccountListSortDTO;
	/**
	 * @description The sort order: asc or desc (default).
	 */
	order?: ServiceaccounttypesServiceAccountListOrderDTO;
	/**
	 * @type integer
	 * @description The page size; defaults to 20 and is capped at 200.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description The number of service accounts to skip; defaults to 0.
	 */
	offset?: number;
};
