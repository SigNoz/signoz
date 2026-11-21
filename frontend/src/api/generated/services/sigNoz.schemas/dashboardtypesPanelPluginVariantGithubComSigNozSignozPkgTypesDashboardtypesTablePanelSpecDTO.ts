/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind';
import type { DashboardtypesTablePanelSpecDTO } from './dashboardtypesTablePanelSpecDTO';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTO {
	/**
	 * @enum signoz/TablePanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesTablePanelSpecDTO;
}
