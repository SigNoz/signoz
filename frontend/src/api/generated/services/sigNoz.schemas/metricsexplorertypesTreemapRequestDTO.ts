/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricsexplorertypesTreemapModeDTO } from './metricsexplorertypesTreemapModeDTO';
import type { Querybuildertypesv5FilterDTO } from './querybuildertypesv5FilterDTO';

export interface MetricsexplorertypesTreemapRequestDTO {
	/**
	 * @type integer
	 * @format int64
	 * @description End of the time range as a Unix timestamp in milliseconds. Must be greater than start.
	 */
	end: number;
	/**
	 * @description Query builder filter over metric attributes, for example host.name = 'web-1'. A bare word matches the metric name. Omitting it applies no restriction, but metrics whose name starts with signoz are always excluded.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type integer
	 * @description Maximum number of metrics to return, between 1 and 5000, ordered by percentage descending.
	 */
	limit: number;
	/**
	 * @description What each metric is sized by: timeseries counts distinct time series; samples counts ingested data points, ranked among a shortlist of the metrics with the most time series. Only the matching response array is populated.
	 */
	mode: MetricsexplorertypesTreemapModeDTO;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end.
	 */
	start: number;
}
