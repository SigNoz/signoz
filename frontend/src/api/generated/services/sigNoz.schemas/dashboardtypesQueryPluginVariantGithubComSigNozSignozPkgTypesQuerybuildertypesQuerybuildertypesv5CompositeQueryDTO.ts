/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind } from './dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind';
import type { Querybuildertypesv5CompositeQueryDTO } from './querybuildertypesv5CompositeQueryDTO';

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTO {
	/**
	 * @enum signoz/CompositeQuery
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5CompositeQueryDTO;
}
