/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDynamicVariableSpecDTO } from './dashboardtypesDynamicVariableSpecDTO';
import type { DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind } from './dashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind';

export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTO {
	/**
	 * @enum signoz/DynamicVariable
	 * @type string
	 * @description The value source kind.
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind;
	/**
	 * @description The kind-specific value source spec.
	 */
	spec: DashboardtypesDynamicVariableSpecDTO;
}
