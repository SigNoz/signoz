/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5FilterDTO } from './querybuildertypesv5FilterDTO';
import type { Querybuildertypesv5OrderByDTO } from './querybuildertypesv5OrderByDTO';

export interface MetricsexplorertypesStatsRequestDTO {
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
	 * @description Maximum number of metrics to return, between 1 and 5000.
	 */
	limit: number;
	/**
	 * @type integer
	 * @description Number of metrics to skip for pagination. Must not be negative; defaults to 0.
	 */
	offset?: number;
	/**
	 * @description Sort order; key.name is timeseries or samples, direction is asc or desc. Defaults to samples descending.
	 */
	orderBy?: Querybuildertypesv5OrderByDTO;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end.
	 */
	start: number;
}
