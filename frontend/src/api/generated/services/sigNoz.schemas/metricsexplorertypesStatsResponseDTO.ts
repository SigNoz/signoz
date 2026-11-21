/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricsexplorertypesStatDTO } from './metricsexplorertypesStatDTO';

export interface MetricsexplorertypesStatsResponseDTO {
	/**
	 * @type array,null
	 * @description One entry per metric on the requested page, in the requested order.
	 */
	metrics: MetricsexplorertypesStatDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Total number of metrics matching the filter across all pages.
	 */
	total: number;
}
