/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesNodeConditionDTO } from './inframonitoringtypesNodeConditionDTO';
import type { InframonitoringtypesNodeCountsByReadinessDTO } from './inframonitoringtypesNodeCountsByReadinessDTO';
import type { InframonitoringtypesNodeRecordDTOMeta } from './inframonitoringtypesNodeRecordDTOMeta';
import type { InframonitoringtypesPodCountsByStatusDTO } from './inframonitoringtypesPodCountsByStatusDTO';

export interface InframonitoringtypesNodeRecordDTO {
	condition: InframonitoringtypesNodeConditionDTO;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesNodeRecordDTOMeta;
	/**
	 * @type number
	 * @format double
	 */
	nodeCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	nodeCPUAllocatable: number;
	nodeCountsByReadiness: InframonitoringtypesNodeCountsByReadinessDTO;
	/**
	 * @type number
	 * @format double
	 */
	nodeMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	nodeMemoryAllocatable: number;
	/**
	 * @type string
	 */
	nodeName: string;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}
