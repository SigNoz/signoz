/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricreductionruletypesMatchTypeDTO } from './metricreductionruletypesMatchTypeDTO';

export interface MetricreductionruletypesPostableReductionRuleDTO {
	/**
	 * @type array,null
	 */
	labels: string[] | null;
	matchType: MetricreductionruletypesMatchTypeDTO;
	/**
	 * @type string
	 */
	metricName: string;
}
