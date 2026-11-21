/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesScatterPlotPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesScatterPlotPanelSpecDTOKind';
import type { DashboardtypesScatterPlotPanelSpecDTO } from './dashboardtypesScatterPlotPanelSpecDTO';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesScatterPlotPanelSpecDTO {
	/**
	 * @enum signoz/ScatterPlotPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesScatterPlotPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesScatterPlotPanelSpecDTO;
}
