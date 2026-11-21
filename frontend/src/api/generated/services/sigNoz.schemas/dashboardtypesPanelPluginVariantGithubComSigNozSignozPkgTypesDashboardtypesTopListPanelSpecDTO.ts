/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind';
import type { DashboardtypesTopListPanelSpecDTO } from './dashboardtypesTopListPanelSpecDTO';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTO {
	/**
	 * @enum signoz/TopListPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTopListPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesTopListPanelSpecDTO;
}
