/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesAreaChartPanelSpecDTO } from './dashboardtypesAreaChartPanelSpecDTO';
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTO {
	/**
	 * @enum signoz/AreaChartPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesAreaChartPanelSpecDTO;
}
