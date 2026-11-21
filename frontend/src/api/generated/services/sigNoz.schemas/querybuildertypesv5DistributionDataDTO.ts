/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5DistributionAggregationDTO } from './querybuildertypesv5DistributionAggregationDTO';

export interface Querybuildertypesv5DistributionDataDTO {
	/**
	 * @type array,null
	 * @description One entry per aggregation of the query. The order is not guaranteed; match entries to aggregations by index.
	 */
	aggregations: Querybuildertypesv5DistributionAggregationDTO[] | null;
	/**
	 * @type string
	 * @description The name of the query that produced this result.
	 */
	queryName: string;
}
