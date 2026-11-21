/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5FilterDTO } from './querybuildertypesv5FilterDTO';

export interface MetricsexplorertypesInspectMetricsRequestDTO {
	/**
	 * @type integer
	 * @format int64
	 * @description End of the time range as a Unix timestamp in milliseconds. At most 30 minutes after start.
	 */
	end: number;
	/**
	 * @description Query builder filter over the metric attributes, for example host.name = 'web-1'. Omitting it applies no attribute restriction; inspection returns at most 50 series either way.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type string
	 * @description The name of the metric to inspect.
	 */
	metricName: string;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end.
	 */
	start: number;
}
