/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardGridItemDTO } from './dashboardGridItemDTO';
import type { DashboardGridLayoutDisplayDTO } from './dashboardGridLayoutDisplayDTO';

export interface DashboardGridLayoutSpecDTO {
	display?: DashboardGridLayoutDisplayDTO;
	/**
	 * @type array,null
	 */
	items?: DashboardGridItemDTO[] | null;
	/**
	 * @type string
	 */
	repeatVariable?: string;
}
