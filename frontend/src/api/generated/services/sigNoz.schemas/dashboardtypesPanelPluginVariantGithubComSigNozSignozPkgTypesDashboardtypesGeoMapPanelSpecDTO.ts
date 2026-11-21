/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesGeoMapPanelSpecDTO } from './dashboardtypesGeoMapPanelSpecDTO';
import type { DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesGeoMapPanelSpecDTOKind } from './dashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesGeoMapPanelSpecDTOKind';

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesGeoMapPanelSpecDTO {
	/**
	 * @enum signoz/GeoMapPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesGeoMapPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesGeoMapPanelSpecDTO;
}
