/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesListedDashboardForUserV2DTO } from './dashboardtypesListedDashboardForUserV2DTO';
import type { TagtypesGettableTagDTO } from './tagtypesGettableTagDTO';

export interface DashboardtypesListableDashboardForUserV2DTO {
	/**
	 * @type array
	 * @description The dashboards on this page, each with the calling user's pin state.
	 */
	dashboards: DashboardtypesListedDashboardForUserV2DTO[];
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
