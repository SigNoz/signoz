/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5QueryEnvelopeDTO } from './querybuildertypesv5QueryEnvelopeDTO';
import type { RuletypesPanelTypeDTO } from './ruletypesPanelTypeDTO';
import type { RuletypesQueryTypeDTO } from './ruletypesQueryTypeDTO';

export interface RuletypesAlertCompositeQueryDTO {
	/**
	 * @description The panel the UI renders the queries with: graph, table or value. Use graph for alerts.
	 */
	panelType: RuletypesPanelTypeDTO;
	/**
	 * @type array,null
	 * @description The queries to evaluate, at least one. Every envelope type must match queryType: builder_query and builder_formula for builder, promql for promql, clickhouse_sql for clickhouse_sql.
	 */
	queries: Querybuildertypesv5QueryEnvelopeDTO[] | null;
	/**
	 * @description The query language of every query: builder, promql or clickhouse_sql.
	 */
	queryType: RuletypesQueryTypeDTO;
	/**
	 * @type string
	 * @description The unit of the query result, such as percent, ms or bytes. Used to format values in notifications and to convert thresholds given in a different targetUnit.
	 */
	unit?: string;
}
