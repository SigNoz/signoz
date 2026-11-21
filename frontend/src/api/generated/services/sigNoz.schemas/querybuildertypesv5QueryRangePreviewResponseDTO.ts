/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQuery } from './querybuildertypesv5QueryRangePreviewResponseDTOCompositeQuery';

/**
 * Response from the v5 query range preview (dry-run) endpoint. For each query in the composite query, returns the underlying ClickHouse statement(s) it renders to without executing them (one per PromQL metric selector; exactly one for builder/ClickHouse/trace-operator queries), with the optional EXPLAIN ESTIMATE and granule analysis attached per statement when requested.
 */
export interface Querybuildertypesv5QueryRangePreviewResponseDTO {
	/**
	 * @type object,null
	 * @description The rendered statements for each query, keyed by query name.
	 */
	compositeQuery: Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQuery;
}
