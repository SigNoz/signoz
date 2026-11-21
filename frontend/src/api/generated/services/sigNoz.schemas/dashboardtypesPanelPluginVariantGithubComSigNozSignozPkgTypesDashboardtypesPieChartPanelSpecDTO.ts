/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind';
import type { DashboardtypesPieChartPanelSpecDTO } from './dashboardtypesPieChartPanelSpecDTO';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTO {
	/**
	 * @enum signoz/PieChartPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesPieChartPanelSpecDTO;
}
