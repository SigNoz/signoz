/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTOKind } from './dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTOKind';
import type { Querybuildertypesv5PromQueryDTO } from './querybuildertypesv5PromQueryDTO';

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTO {
	/**
	 * @enum signoz/PromQLQuery
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5PromQueryDTO;
}
