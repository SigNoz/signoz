/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesAlertCompositeQueryDTO } from './ruletypesAlertCompositeQueryDTO';
import type { RuletypesRuleThresholdDataDTO } from './ruletypesRuleThresholdDataDTO';
import type { RuletypesSeasonalityDTO } from './ruletypesSeasonalityDTO';

export interface RuletypesRuleConditionDTO {
	/**
	 * @type integer
	 * @minimum 0
	 * @description How many minutes without data pass before the nodata alert fires. Ignored unless alertOnAbsent is true.
	 */
	absentFor?: number;
	/**
	 * @type boolean
	 * @description Whether to fire a nodata alert when the query returns no data. Defaults to false.
	 */
	alertOnAbsent?: boolean;
	/**
	 * @description The queries whose result is compared against the thresholds.
	 */
	compositeQuery: RuletypesAlertCompositeQueryDTO;
	/**
	 * @type boolean
	 * @description Whether a series is skipped until it has at least requiredNumPoints points in the window. Defaults to false.
	 */
	requireMinPoints?: boolean;
	/**
	 * @type integer
	 * @description The minimum number of points a series needs before it is evaluated. Must be greater than 0 when requireMinPoints is true.
	 */
	requiredNumPoints?: number;
	/**
	 * @description anomaly_rule only: the seasonal period the history is compared against, hourly, daily or weekly.
	 */
	seasonality?: RuletypesSeasonalityDTO;
	/**
	 * @type string
	 * @description The name of the query whose result is evaluated, such as A or F1. Must match a query in compositeQuery.
	 */
	selectedQueryName: string;
	/**
	 * @description The thresholds to evaluate, as a kind and spec.
	 */
	thresholds: RuletypesRuleThresholdDataDTO;
}
