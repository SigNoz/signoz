/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesListedDashboardV2DTO } from './dashboardtypesListedDashboardV2DTO';
import type { TagtypesGettableTagDTO } from './tagtypesGettableTagDTO';

export interface DashboardtypesListableDashboardV2DTO {
	/**
	 * @type array
	 * @description The dashboards on this page.
	 */
	dashboards: DashboardtypesListedDashboardV2DTO[];
	/**
	 * @type array
	 * @description The filter keys that address dashboard columns rather than tags.
	 */
	reservedKeywords: string[];
	/**
	 * @type array
	 * @description Every dashboard tag in the organization, for building filters.
	 */
	tags: TagtypesGettableTagDTO[];
	/**
	 * @type integer
	 * @format int64
	 * @description The number of dashboards matching the filter across every page.
	 */
	total: number;
}
