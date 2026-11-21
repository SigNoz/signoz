/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesHeatmapPanelSpecDTO } from './dashboardtypesHeatmapPanelSpecDTO';
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTO {
	/**
	 * @enum signoz/HeatmapPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesHeatmapPanelSpecDTO;
}
