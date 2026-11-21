/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesCompareOperatorDTO } from './ruletypesCompareOperatorDTO';
import type { RuletypesMatchTypeDTO } from './ruletypesMatchTypeDTO';

export interface RuletypesBasicRuleThresholdDTO {
	/**
	 * @type array,null
	 * @description The displayName of each notification channel alerts crossing this threshold are sent to. Ignored when notificationSettings.usePolicy is true.
	 */
	channels?: string[] | null;
	/**
	 * @description Which points in the window must satisfy op. Accepted as at_least_once, all_the_times, on_average, in_total or last, their aliases avg and sum, or the legacy codes as strings, '1' to '5'.
	 */
	matchType: RuletypesMatchTypeDTO;
	/**
	 * @type string
	 * @description The threshold name, conventionally critical, error, warning or info. Alerts carry it as the threshold.name label and, lowercased, as the severity label; templates can read it as $threshold.name.
	 */
	name: string;
	/**
	 * @description How the value is compared with target. Accepted as above, below, equal, not_equal, above_or_equal, below_or_equal or outside_bounds, their symbols, or the legacy codes as strings, '1' to '7'.
	 */
	op: RuletypesCompareOperatorDTO;
	/**
	 * @type number,null
	 * @format double
	 * @description The value at which a firing alert resolves, in targetUnit. Keeps an alert firing between target and recoveryTarget to avoid flapping; null resolves at target.
	 */
	recoveryTarget?: number | null;
	/**
	 * @type number,null
	 * @format double
	 * @description The value the query result is compared against, in targetUnit.
	 */
	target: number | null;
	/**
	 * @type string
	 * @description The unit of target and recoveryTarget, such as percent or ms. Converted to the query unit before comparison when the two differ; empty means the query unit.
	 */
	targetUnit?: string;
}
