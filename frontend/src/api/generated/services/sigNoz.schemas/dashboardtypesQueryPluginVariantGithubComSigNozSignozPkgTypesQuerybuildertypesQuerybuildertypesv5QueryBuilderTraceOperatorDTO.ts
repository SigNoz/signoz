/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTOKind } from './dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTOKind';
import type { Querybuildertypesv5QueryBuilderTraceOperatorDTO } from './querybuildertypesv5QueryBuilderTraceOperatorDTO';

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTO {
	/**
	 * @enum signoz/TraceOperator
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5QueryBuilderTraceOperatorDTO;
}
