/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricsexplorertypesTreemapEntryDTO } from './metricsexplorertypesTreemapEntryDTO';

export interface MetricsexplorertypesTreemapResponseDTO {
	/**
	 * @type array,null
	 * @description Entries sized by sample count, chosen among the metrics with the most time series; populated only when mode is samples.
	 */
	samples: MetricsexplorertypesTreemapEntryDTO[] | null;
	/**
	 * @type array,null
	 * @description Entries sized by time series count; populated only when mode is timeseries.
	 */
	timeseries: MetricsexplorertypesTreemapEntryDTO[] | null;
}
