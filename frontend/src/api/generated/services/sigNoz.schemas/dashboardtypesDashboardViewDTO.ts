/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDashboardViewDataDTO } from './dashboardtypesDashboardViewDataDTO';

export interface DashboardtypesDashboardViewDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @description The saved list filter and sort.
	 */
	data: DashboardtypesDashboardViewDataDTO;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 * @description The view name.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization that owns the view.
	 */
	orgId: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}
