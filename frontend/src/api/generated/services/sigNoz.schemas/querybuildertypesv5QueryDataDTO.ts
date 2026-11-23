/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5DistributionDataDTO } from './querybuildertypesv5DistributionDataDTO';
import type { Querybuildertypesv5RawDataDTO } from './querybuildertypesv5RawDataDTO';
import type { Querybuildertypesv5ScalarDataDTO } from './querybuildertypesv5ScalarDataDTO';
import type { Querybuildertypesv5TimeSeriesDataDTO } from './querybuildertypesv5TimeSeriesDataDTO';

export type Querybuildertypesv5QueryDataDTO =
	| (Querybuildertypesv5TimeSeriesDataDTO & {
			/**
			 * @type array,null
			 * @description One result per enabled query, typed by the request type: TimeSeriesData for time_series and heatmap, ScalarData for scalar, RawData for raw and DistributionData for distribution requests.
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5ScalarDataDTO & {
			/**
			 * @type array,null
			 * @description One result per enabled query, typed by the request type: TimeSeriesData for time_series and heatmap, ScalarData for scalar, RawData for raw and DistributionData for distribution requests.
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5RawDataDTO & {
			/**
			 * @type array,null
			 * @description One result per enabled query, typed by the request type: TimeSeriesData for time_series and heatmap, ScalarData for scalar, RawData for raw and DistributionData for distribution requests.
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5DistributionDataDTO & {
			/**
			 * @type array,null
			 * @description One result per enabled query, typed by the request type: TimeSeriesData for time_series and heatmap, ScalarData for scalar, RawData for raw and DistributionData for distribution requests.
			 */
			results?: unknown[] | null;
	  });
