/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesQueryVariableSpecDTO } from './dashboardtypesQueryVariableSpecDTO';
import type { DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind } from './dashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind';

export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTO {
	/**
	 * @enum signoz/QueryVariable
	 * @type string
	 * @description The value source kind.
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind;
	/**
	 * @description The kind-specific value source spec.
	 */
	spec: DashboardtypesQueryVariableSpecDTO;
}
