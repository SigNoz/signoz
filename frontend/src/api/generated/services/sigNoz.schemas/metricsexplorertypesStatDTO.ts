/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetrictypesTypeDTO } from './metrictypesTypeDTO';

export interface MetricsexplorertypesStatDTO {
	/**
	 * @type string
	 * @description Human-readable description from the metric metadata; empty when none was reported.
	 */
	description: string;
	/**
	 * @type string
	 * @description The name of the metric.
	 */
	metricName: string;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of samples (data points) ingested for the metric in the requested time range.
	 */
	samples: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of distinct time series active in the time range, approximate: it can include series last active shortly before start.
	 */
	timeseries: number;
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
