/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5AggregationMetaDTO } from './querybuildertypesv5AggregationMetaDTO';
import type { Querybuildertypesv5TimeSeriesDTO } from './querybuildertypesv5TimeSeriesDTO';

export interface Querybuildertypesv5AggregationBucketDTO {
	/**
	 * @type string
	 * @description The alias of the aggregation, or the internal name __result_N, with N its index, when no alias was given.
	 */
	alias?: string;
	/**
	 * @type array
	 * @description The anomaly score per series; present only when the anomaly function is applied.
	 */
	anomalyScores?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @type integer
	 * @description The zero-based position of the aggregation in the query.
	 */
	index?: number;
	/**
	 * @type array
	 * @description The lower bound of the expected range per series; present only when the anomaly function is applied.
	 */
	lowerBoundSeries?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @description Display metadata for the aggregation.
	 */
	meta?: Querybuildertypesv5AggregationMetaDTO;
	/**
	 * @type array
	 * @description The predicted values per series; present only when the anomaly function is applied.
	 */
	predictedSeries?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @type array,null
	 * @description One series per group-by combination.
	 */
	series?: Querybuildertypesv5TimeSeriesDTO[] | null;
	/**
	 * @type array
	 * @description The upper bound of the expected range per series; present only when the anomaly function is applied.
	 */
	upperBoundSeries?: Querybuildertypesv5TimeSeriesDTO[];
}
