/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5TimeSeriesDTO } from './querybuildertypesv5TimeSeriesDTO';

export interface RulestatehistorytypesGettableRuleStateHistoryStatsDTO {
	/**
	 * @type number
	 * @format double
	 */
	currentAvgResolutionTime: number;
	currentAvgResolutionTimeSeries: Querybuildertypesv5TimeSeriesDTO;
	currentTriggersSeries: Querybuildertypesv5TimeSeriesDTO;
	/**
	 * @type number
	 * @format double
	 */
	pastAvgResolutionTime: number;
	pastAvgResolutionTimeSeries: Querybuildertypesv5TimeSeriesDTO;
	pastTriggersSeries: Querybuildertypesv5TimeSeriesDTO;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalCurrentTriggers: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalPastTriggers: number;
}
