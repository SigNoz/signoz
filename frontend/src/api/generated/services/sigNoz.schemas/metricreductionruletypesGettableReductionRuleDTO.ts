/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricreductionruletypesMatchTypeDTO } from './metricreductionruletypesMatchTypeDTO';

export interface MetricreductionruletypesGettableReductionRuleDTO {
	/**
	 * @type boolean
	 */
	active: boolean;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	effectiveFrom: string;
	/**
	 * @type string
	 */
	id: string;
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
	 * @type array,null
	 */
	labels: string[] | null;
	matchType: MetricreductionruletypesMatchTypeDTO;
	/**
	 * @type string
	 */
	metricName: string;
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
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}
