/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesListOrderDTO } from './dashboardtypesListOrderDTO';
import type { DashboardtypesListSortDTO } from './dashboardtypesListSortDTO';

export interface DashboardtypesDashboardViewDataDTO {
	/**
	 * @description The sort direction: asc or desc (default).
	 */
	order?: DashboardtypesListOrderDTO;
	/**
	 * @type string
	 * @description A filter expression over the reserved keys name, description, created_at, updated_at, created_by and locked, and over tag keys, using the SigNoz filter grammar: comparisons such as =, !=, CONTAINS, LIKE, IN, < and >, single-quoted strings, RFC3339 timestamps in quotes for created_at and updated_at, combined with AND, OR and NOT, for example name CONTAINS 'overview' AND created_at >= '2026-10-21T00:00:00Z'. At most 1024 characters. Empty matches every dashboard.
	 */
	query?: string;
	/**
	 * @description The sort field: updated_at (default), created_at or name.
	 */
	sort?: DashboardtypesListSortDTO;
	/**
	 * @type string
	 * @description The view data schema version. Must be v1.
	 */
	version: string;
}
