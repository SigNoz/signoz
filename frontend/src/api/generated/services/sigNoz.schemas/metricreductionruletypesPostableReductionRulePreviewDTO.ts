/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricreductionruletypesMatchTypeDTO } from './metricreductionruletypesMatchTypeDTO';

export interface MetricreductionruletypesPostableReductionRulePreviewDTO {
	/**
	 * @type array,null
	 */
	labels: string[] | null;
	/**
	 * @type integer
	 * @format int64
	 */
	lookbackMs?: number;
	matchType: MetricreductionruletypesMatchTypeDTO;
	/**
	 * @type string
	 */
	metricName: string;
}
