/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5ExecStatsDTO } from './querybuildertypesv5ExecStatsDTO';
import type { Querybuildertypesv5QueryDataDTO } from './querybuildertypesv5QueryDataDTO';
import type { Querybuildertypesv5QueryWarnDataDTO } from './querybuildertypesv5QueryWarnDataDTO';
import type { Querybuildertypesv5RequestTypeDTO } from './querybuildertypesv5RequestTypeDTO';

/**
 * Response from the v5 query range endpoint. The data.results array contains typed results depending on the requestType: TimeSeriesData for time_series and heatmap, ScalarData for scalar, RawData for raw, or DistributionData for distribution requests.
 */
export interface Querybuildertypesv5QueryRangeResponseDTO {
	/**
	 * @description The query results.
	 */
	data?: Querybuildertypesv5QueryDataDTO;
	/**
	 * @description Execution statistics for the whole request: a rough measure of how expensive the query was. Use the results, not these numbers, to decide whether data exists; an empty result can still scan many rows.
	 */
	meta?: Querybuildertypesv5ExecStatsDTO;
	/**
	 * @description The request type the results are shaped for, echoed from the request.
	 */
	type?: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @description Warnings raised while executing the request, if any.
	 */
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}
