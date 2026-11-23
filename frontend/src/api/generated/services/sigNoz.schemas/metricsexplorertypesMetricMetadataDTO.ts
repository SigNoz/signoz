/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetrictypesTemporalityDTO } from './metrictypesTemporalityDTO';
import type { MetrictypesTypeDTO } from './metrictypesTypeDTO';

export interface MetricsexplorertypesMetricMetadataDTO {
	/**
	 * @type string
	 * @description Human-readable description of the metric; empty when none was reported.
	 */
	description: string;
	/**
	 * @type boolean
	 * @description True when the metric is a monotonically increasing Sum (a counter).
	 */
	isMonotonic: boolean;
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
	 * @description The unit of the metric values, for example ms or By; empty when none was reported.
	 */
	unit: string;
}
