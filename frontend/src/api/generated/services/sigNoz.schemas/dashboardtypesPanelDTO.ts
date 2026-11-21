/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPanelKindDTO } from './dashboardtypesPanelKindDTO';
import type { DashboardtypesPanelSpecDTO } from './dashboardtypesPanelSpecDTO';

export interface DashboardtypesPanelDTO {
	/**
	 * @description The panel envelope kind. Always Panel.
	 */
	kind: DashboardtypesPanelKindDTO;
	/**
	 * @description The panel content: display, plugin, queries and links.
	 */
	spec: DashboardtypesPanelSpecDTO;
}
