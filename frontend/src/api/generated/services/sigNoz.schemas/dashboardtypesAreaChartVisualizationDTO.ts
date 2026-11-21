/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesStackModeDTO } from './dashboardtypesStackModeDTO';
import type { DashboardtypesTimePreferenceDTO } from './dashboardtypesTimePreferenceDTO';

export interface DashboardtypesAreaChartVisualizationDTO {
	/**
	 * @type boolean
	 * @description Whether intervals with no data are drawn as zero instead of a gap.
	 */
	fillSpans?: boolean;
	/**
	 * @description How the areas combine: none (default) overlays them, normal stacks the values, percent stacks them as shares of the total.
	 */
	stack?: DashboardtypesStackModeDTO;
	/**
	 * @description The time range the panel queries: global_time (default) follows the dashboard range; last_5_min, last_15_min, last_30_min, last_1_hr, last_6_hr, last_1_day, last_3_days, last_1_week or last_1_month pin a fixed window.
	 */
	timePreference?: DashboardtypesTimePreferenceDTO;
}
