/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface DashboardtypesDashboardPanelRefDTO {
	/**
	 * @type string
	 * @description The id of the dashboard containing the panel.
	 */
	dashboardId: string;
	/**
	 * @type string
	 * @description The dashboard name.
	 */
	dashboardName: string;
	/**
	 * @type array
	 * @description The metric labels the panel filters on.
	 */
	filterBy?: string[];
	/**
	 * @type array
	 * @description The metric labels the panel groups by.
	 */
	groupBy?: string[];
	/**
	 * @type string
	 * @description The panel id within the dashboard.
	 */
	panelId: string;
	/**
	 * @type string
	 * @description The panel title.
	 */
	panelName: string;
}
