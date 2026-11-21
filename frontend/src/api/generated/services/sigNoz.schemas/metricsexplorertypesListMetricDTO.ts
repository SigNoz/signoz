/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetrictypesTemporalityDTO } from './metrictypesTemporalityDTO';
import type { MetrictypesTypeDTO } from './metrictypesTypeDTO';

export interface MetricsexplorertypesListMetricDTO {
	/**
	 * @type string
	 * @description Human-readable description from the metric metadata; empty when none was reported.
	 */
	description: string;
	/**
	 * @type boolean
	 * @description True when the metric is a monotonically increasing Sum (a counter).
	 */
	isMonotonic: boolean;
	/**
	 * @type string
	 * @description The name of the metric.
	 */
	metricName: string;
	/**
	 * @description Aggregation temporality of the metric: cumulative, delta or unspecified.
	 */
	temporality: MetrictypesTemporalityDTO;
	/**
	 * @description The metric type, such as gauge, sum, histogram, summary or exponentialhistogram.
	 */
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 * @description The unit reported in the metric metadata, for example ms or By; empty when none was reported.
	 */
	unit: string;
}
