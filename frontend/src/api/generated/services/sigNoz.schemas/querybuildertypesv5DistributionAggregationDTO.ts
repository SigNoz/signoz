/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5AggregationMetaDTO } from './querybuildertypesv5AggregationMetaDTO';
import type { Querybuildertypesv5DistributionDTO } from './querybuildertypesv5DistributionDTO';
import type { Querybuildertypesv5DistributionPercentilesDTO } from './querybuildertypesv5DistributionPercentilesDTO';

export interface Querybuildertypesv5DistributionAggregationDTO {
	/**
	 * @type string
	 * @description The alias of the aggregation, or the internal name __result_N, with N its index, when no alias was given.
	 */
	alias: string;
	/**
	 * @type array,null
	 * @description One distribution per group-by combination.
	 */
	distributions: Querybuildertypesv5DistributionDTO[] | null;
	/**
	 * @type integer
	 * @description The zero-based position of the aggregation in the query.
	 */
	index: number;
	/**
	 * @description Display metadata for the aggregation, including the bucket upper bounds the counts are positional against.
	 */
	meta?: Querybuildertypesv5AggregationMetaDTO;
	/**
	 * @description Percentiles over the counts of every distribution added together, estimated the way histogram_quantile does by interpolating linearly within the bucket each rank falls in. Omitted when nothing was counted or meta.buckets is empty.
	 */
	percentiles?: Querybuildertypesv5DistributionPercentilesDTO;
}
