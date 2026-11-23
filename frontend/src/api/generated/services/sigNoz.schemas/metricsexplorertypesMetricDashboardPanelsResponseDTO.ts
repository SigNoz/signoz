/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDashboardPanelRefDTO } from './dashboardtypesDashboardPanelRefDTO';

export interface MetricsexplorertypesMetricDashboardPanelsResponseDTO {
	/**
	 * @type array,null
	 * @description One entry per dashboard panel whose query references the metric.
	 */
	dashboards: DashboardtypesDashboardPanelRefDTO[] | null;
}
