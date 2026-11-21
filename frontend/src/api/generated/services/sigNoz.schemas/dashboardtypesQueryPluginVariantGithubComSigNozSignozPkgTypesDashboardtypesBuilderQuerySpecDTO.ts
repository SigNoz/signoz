/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBuilderQuerySpecDTO } from './dashboardtypesBuilderQuerySpecDTO';
import type { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind } from './dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind';

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTO {
	/**
	 * @enum signoz/BuilderQuery
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: DashboardtypesBuilderQuerySpecDTO;
}
