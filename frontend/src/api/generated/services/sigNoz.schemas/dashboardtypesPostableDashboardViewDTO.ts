/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDashboardViewDataDTO } from './dashboardtypesDashboardViewDataDTO';

export interface DashboardtypesPostableDashboardViewDTO {
	/**
	 * @description The list filter and sort to save.
	 */
	data: DashboardtypesDashboardViewDataDTO;
	/**
	 * @type string
	 * @maxLength 64
	 * @description The view name, at most 64 characters.
	 */
	name: string;
}
