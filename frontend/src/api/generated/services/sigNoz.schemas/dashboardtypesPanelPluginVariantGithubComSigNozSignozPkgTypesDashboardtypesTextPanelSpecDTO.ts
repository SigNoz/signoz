/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind';
import type { DashboardtypesTextPanelSpecDTO } from './dashboardtypesTextPanelSpecDTO';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTO {
	/**
	 * @enum signoz/TextPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesTextPanelSpecDTO;
}
