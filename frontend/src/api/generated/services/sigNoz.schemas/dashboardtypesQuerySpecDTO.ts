/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesQueryPluginDTO } from './dashboardtypesQueryPluginDTO';

export interface DashboardtypesQuerySpecDTO {
	/**
	 * @type string
	 * @description An optional label for the query. The name queries refer to each other by lives in the plugin spec.
	 */
	name?: string;
	/**
	 * @description The query: kind is one of signoz/BuilderQuery, signoz/AIBuilderQuery (builder query over AI observability traces), signoz/CompositeQuery (several named queries and formulas), signoz/Formula, signoz/PromQLQuery, signoz/ClickHouseSQL or signoz/TraceOperator, and spec holds that kind's query. Pie and table panels reject signoz/PromQLQuery; heatmap panels reject signoz/AIBuilderQuery and signoz/TraceOperator; list panels accept only signoz/BuilderQuery and signoz/AIBuilderQuery.
	 */
	plugin: DashboardtypesQueryPluginDTO;
}
