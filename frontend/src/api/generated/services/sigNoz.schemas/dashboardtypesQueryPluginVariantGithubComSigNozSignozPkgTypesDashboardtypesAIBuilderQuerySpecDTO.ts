/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesAIBuilderQuerySpecDTO } from './dashboardtypesAIBuilderQuerySpecDTO';
import type { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAIBuilderQuerySpecDTOKind } from './dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAIBuilderQuerySpecDTOKind';

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAIBuilderQuerySpecDTO {
	/**
	 * @enum signoz/AIBuilderQuery
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAIBuilderQuerySpecDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: DashboardtypesAIBuilderQuerySpecDTO;
}
