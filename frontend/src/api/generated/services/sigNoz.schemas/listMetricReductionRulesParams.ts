/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricreductionruletypesOrderDTO } from './metricreductionruletypesOrderDTO';
import type { MetricreductionruletypesReductionRuleOrderByDTO } from './metricreductionruletypesReductionRuleOrderByDTO';

export type ListMetricReductionRulesParams = {
	/**
	 * @description undefined
	 */
	orderBy?: MetricreductionruletypesReductionRuleOrderByDTO;
	/**
	 * @description undefined
	 */
	order?: MetricreductionruletypesOrderDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	search?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
	/**
	 * @type integer
	 * @description undefined
	 */
	offset?: number;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
};
