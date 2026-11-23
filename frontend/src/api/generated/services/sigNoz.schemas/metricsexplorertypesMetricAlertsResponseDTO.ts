/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricsexplorertypesMetricAlertDTO } from './metricsexplorertypesMetricAlertDTO';

export interface MetricsexplorertypesMetricAlertsResponseDTO {
	/**
	 * @type array,null
	 * @description Alert rules whose queries reference the metric.
	 */
	alerts: MetricsexplorertypesMetricAlertDTO[] | null;
}
