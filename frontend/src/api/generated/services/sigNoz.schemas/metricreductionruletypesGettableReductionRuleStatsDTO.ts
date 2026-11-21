/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface MetricreductionruletypesGettableReductionRuleStatsDTO {
	/**
	 * @type number
	 * @format double
	 */
	estimatedMonthlySavingsUsd: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	ingestedSamples: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	ingestedSeries: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	retainedSamples: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	retainedSeries: number;
}
