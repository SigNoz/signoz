/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricreductionruletypesAffectedAssetDTO } from './metricreductionruletypesAffectedAssetDTO';

export interface MetricreductionruletypesGettableReductionRulePreviewDTO {
	/**
	 * @type array,null
	 */
	affectedAssets: MetricreductionruletypesAffectedAssetDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 */
	currentRetainedSeries: number;
	/**
	 * @type array,null
	 */
	droppedLabels: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	effectiveFrom: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	ingestedSeries: number;
	/**
	 * @type number
	 * @format double
	 */
	reductionPercent: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	retainedSeries: number;
}
