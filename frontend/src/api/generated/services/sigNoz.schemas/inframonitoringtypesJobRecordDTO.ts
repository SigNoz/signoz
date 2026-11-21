/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesJobRecordDTOMeta } from './inframonitoringtypesJobRecordDTOMeta';
import type { InframonitoringtypesPodCountsByStatusDTO } from './inframonitoringtypesPodCountsByStatusDTO';

export interface InframonitoringtypesJobRecordDTO {
	/**
	 * @type integer
	 */
	activePods: number;
	/**
	 * @type integer
	 */
	desiredSuccessfulPods: number;
	/**
	 * @type integer
	 */
	failedPods: number;
	/**
	 * @type number
	 * @format double
	 */
	jobCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	jobCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	jobCPURequest: number;
	/**
	 * @type number
	 * @format double
	 */
	jobMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	jobMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	jobMemoryRequest: number;
	/**
	 * @type string
	 */
	jobName: string;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesJobRecordDTOMeta;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
	/**
	 * @type integer
	 */
	successfulPods: number;
}
