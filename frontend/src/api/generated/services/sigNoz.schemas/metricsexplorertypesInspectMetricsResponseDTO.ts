/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5TimeSeriesDTO } from './querybuildertypesv5TimeSeriesDTO';

export interface MetricsexplorertypesInspectMetricsResponseDTO {
	/**
	 * @type array,null
	 * @description Raw time series, at most 50, each with its labels and timestamp-value pairs.
	 */
	series: Querybuildertypesv5TimeSeriesDTO[] | null;
}
