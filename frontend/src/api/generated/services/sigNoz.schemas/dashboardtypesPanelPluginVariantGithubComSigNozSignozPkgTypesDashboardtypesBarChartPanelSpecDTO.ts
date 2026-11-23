/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBarChartPanelSpecDTO } from './dashboardtypesBarChartPanelSpecDTO';
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTO {
	/**
	 * @enum signoz/BarChartPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesBarChartPanelSpecDTO;
}
