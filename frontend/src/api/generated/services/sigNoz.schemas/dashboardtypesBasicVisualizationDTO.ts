/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesTimePreferenceDTO } from './dashboardtypesTimePreferenceDTO';

export interface DashboardtypesBasicVisualizationDTO {
	/**
	 * @description The time range the panel queries: global_time (default) follows the dashboard range; last_5_min, last_15_min, last_30_min, last_1_hr, last_6_hr, last_1_day, last_3_days, last_1_week or last_1_month pin a fixed window.
	 */
	timePreference?: DashboardtypesTimePreferenceDTO;
}
