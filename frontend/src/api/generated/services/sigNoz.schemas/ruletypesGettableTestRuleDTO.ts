/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface RuletypesGettableTestRuleDTO {
	/**
	 * @type integer
	 * @description The number of alerts the test notification produced. Counts every evaluated series, including those that did not cross the threshold.
	 */
	alertCount?: number;
	/**
	 * @type string
	 * @description A human readable summary of the test evaluation.
	 */
	message?: string;
}
