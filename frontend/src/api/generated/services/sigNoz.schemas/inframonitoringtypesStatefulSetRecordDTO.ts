/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesPodCountsByStatusDTO } from './inframonitoringtypesPodCountsByStatusDTO';
import type { InframonitoringtypesStatefulSetRecordDTOMeta } from './inframonitoringtypesStatefulSetRecordDTOMeta';

export interface InframonitoringtypesStatefulSetRecordDTO {
	/**
	 * @type integer
	 */
	currentPods: number;
	/**
	 * @type integer
	 */
	desiredPods: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesStatefulSetRecordDTOMeta;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetCPURequest: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetMemoryRequest: number;
	/**
	 * @type string
	 */
	statefulSetName: string;
}
