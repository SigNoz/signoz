/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5PreviewStatementDTOGranules } from './querybuildertypesv5PreviewStatementDTOGranules';
import type { TelemetrystoretypesEstimateEntryDTO } from './telemetrystoretypesEstimateEntryDTO';

export interface Querybuildertypesv5PreviewStatementDTO {
	/**
	 * @type array
	 * @description The values bound to the statement placeholders, in order.
	 */
	'db.statement.args': unknown[];
	/**
	 * @type string
	 * @description The ClickHouse SQL statement with positional parameter placeholders.
	 */
	'db.statement.query': string;
	/**
	 * @type array
	 * @description The EXPLAIN ESTIMATE rows for the statement; empty unless verbose was requested.
	 */
	estimate: TelemetrystoretypesEstimateEntryDTO[];
	/**
	 * @description The granule analysis for the statement; null unless verbose was requested.
	 */
	granules: Querybuildertypesv5PreviewStatementDTOGranules;
}
