/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesNumberPanelSpecDTO } from './dashboardtypesNumberPanelSpecDTO';
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTO {
	/**
	 * @enum signoz/NumberPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesNumberPanelSpecDTO;
}
