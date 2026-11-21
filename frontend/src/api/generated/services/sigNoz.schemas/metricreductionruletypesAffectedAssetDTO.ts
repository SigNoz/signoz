/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { MetricreductionruletypesAffectedWidgetDTO } from './metricreductionruletypesAffectedWidgetDTO';
import type { MetricreductionruletypesAssetTypeDTO } from './metricreductionruletypesAssetTypeDTO';

export interface MetricreductionruletypesAffectedAssetDTO {
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type array,null
	 */
	impactedLabels: string[] | null;
	/**
	 * @type string
	 */
	name: string;
	type: MetricreductionruletypesAssetTypeDTO;
	widget?: MetricreductionruletypesAffectedWidgetDTO;
}
