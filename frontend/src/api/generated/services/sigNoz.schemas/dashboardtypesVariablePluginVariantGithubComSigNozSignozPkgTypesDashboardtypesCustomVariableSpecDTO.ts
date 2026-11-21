/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesCustomVariableSpecDTO } from './dashboardtypesCustomVariableSpecDTO';
import type { DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind } from './dashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind';

export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTO {
	/**
	 * @enum signoz/CustomVariable
	 * @type string
	 * @description The value source kind.
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind;
	/**
	 * @description The kind-specific value source spec.
	 */
	spec: DashboardtypesCustomVariableSpecDTO;
}
