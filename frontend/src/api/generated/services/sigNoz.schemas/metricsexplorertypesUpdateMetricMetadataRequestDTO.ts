/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetrictypesTemporalityDTO } from './metrictypesTemporalityDTO';
import type { MetrictypesTypeDTO } from './metrictypesTypeDTO';

export interface MetricsexplorertypesUpdateMetricMetadataRequestDTO {
	/**
	 * @type string
	 * @description Human-readable description of the metric.
	 */
	description: string;
	/**
	 * @type boolean
	 * @description Whether the metric is a monotonically increasing Sum (a counter).
	 */
	isMonotonic: boolean;
	/**
	 * @type string
	 * @description The name of the metric whose metadata to replace.
	 */
	metricName: string;
	/**
	 * @description Aggregation temporality to store. Required as delta or cumulative when type is sum, histogram or exponentialhistogram; gauges are stored as unspecified and summaries as cumulative whatever is sent. A non-monotonic cumulative sum is stored as a gauge.
	 */
	temporality: MetrictypesTemporalityDTO;
	/**
	 * @description The metric type to store, such as gauge, sum, histogram, summary or exponentialhistogram.
	 */
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 * @description The unit of the metric values, for example ms or By.
	 */
	unit: string;
}
