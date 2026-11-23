/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesCollectedLogAttributeDTO } from './cloudintegrationtypesCollectedLogAttributeDTO';
import type { CloudintegrationtypesCollectedMetricDTO } from './cloudintegrationtypesCollectedMetricDTO';

export interface CloudintegrationtypesDataCollectedDTO {
	/**
	 * @type array,null
	 */
	logs?: CloudintegrationtypesCollectedLogAttributeDTO[] | null;
	/**
	 * @type array,null
	 */
	metrics?: CloudintegrationtypesCollectedMetricDTO[] | null;
}
