/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricsexplorertypesMetricAttributeDTO } from './metricsexplorertypesMetricAttributeDTO';

export interface MetricsexplorertypesMetricAttributesResponseDTO {
	/**
	 * @type array,null
	 * @description Attributes of the metric, ordered by distinct value count descending.
	 */
	attributes: MetricsexplorertypesMetricAttributeDTO[] | null;
	/**
	 * @type integer
	 * @format int64
	 * @description Number of attributes returned.
	 */
	totalKeys: number;
}
