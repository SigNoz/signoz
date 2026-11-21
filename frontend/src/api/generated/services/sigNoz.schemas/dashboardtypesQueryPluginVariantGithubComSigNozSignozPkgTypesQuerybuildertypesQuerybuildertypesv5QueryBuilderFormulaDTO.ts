/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTOKind } from './dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTOKind';
import type { Querybuildertypesv5QueryBuilderFormulaDTO } from './querybuildertypesv5QueryBuilderFormulaDTO';

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTO {
	/**
	 * @enum signoz/Formula
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5QueryBuilderFormulaDTO;
}
