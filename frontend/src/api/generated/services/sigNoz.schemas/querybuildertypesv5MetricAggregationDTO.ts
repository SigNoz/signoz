/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetrictypesComparisonSpaceAggregationParamDTO } from './metrictypesComparisonSpaceAggregationParamDTO';
import type { MetrictypesSpaceAggregationDTO } from './metrictypesSpaceAggregationDTO';
import type { MetrictypesTemporalityDTO } from './metrictypesTemporalityDTO';
import type { MetrictypesTimeAggregationDTO } from './metrictypesTimeAggregationDTO';
import type { Querybuildertypesv5ReduceToDTO } from './querybuildertypesv5ReduceToDTO';

export interface Querybuildertypesv5MetricAggregationDTO {
	/**
	 * @description Histogram metrics with spaceAggregation count only: the comparison operator and bucket bound used to estimate how many observations fall at or below, or above, the threshold. Ignored for other metric types and aggregations.
	 */
	comparisonSpaceAggregationParam?: MetrictypesComparisonSpaceAggregationParamDTO;
	/**
	 * @type string
	 * @description The name of the metric to query, for example k8s.pod.cpu_request_utilization.
	 */
	metricName?: string;
	/**
	 * @description How a series collapses to one number in scalar requests: sum, count, avg, min, max, last or median. Ignored by time_series requests.
	 */
	reduceTo?: Querybuildertypesv5ReduceToDTO;
	/**
	 * @description How series are combined across each group, such as sum, avg, min, max or count; histograms take percentiles such as p50, p90, p95 or p99.
	 */
	spaceAggregation?: MetrictypesSpaceAggregationDTO;
	/**
	 * @description The temporality of the metric: delta, cumulative or unspecified. Resolved from the metric metadata when omitted.
	 */
	temporality?: MetrictypesTemporalityDTO;
	/**
	 * @description How samples of one series are combined within each step, such as avg, sum, min, max, count, count_distinct, latest, rate or increase.
	 */
	timeAggregation?: MetrictypesTimeAggregationDTO;
}
