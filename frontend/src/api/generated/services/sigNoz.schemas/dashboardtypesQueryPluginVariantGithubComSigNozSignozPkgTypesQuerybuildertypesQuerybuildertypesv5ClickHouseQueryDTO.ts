/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTOKind } from './dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTOKind';
import type { Querybuildertypesv5ClickHouseQueryDTO } from './querybuildertypesv5ClickHouseQueryDTO';

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTO {
	/**
	 * @enum signoz/ClickHouseSQL
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5ClickHouseQueryDTO;
}
