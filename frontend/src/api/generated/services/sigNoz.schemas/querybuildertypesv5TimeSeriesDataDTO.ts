/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5AggregationBucketDTO } from './querybuildertypesv5AggregationBucketDTO';

export interface Querybuildertypesv5TimeSeriesDataDTO {
	/**
	 * @type array,null
	 * @description One bucket per aggregation of the query. The order is not guaranteed; match buckets to aggregations by index.
	 */
	aggregations?: Querybuildertypesv5AggregationBucketDTO[] | null;
	/**
	 * @type string
	 * @description The name of the query that produced this result.
	 */
	queryName?: string;
}
