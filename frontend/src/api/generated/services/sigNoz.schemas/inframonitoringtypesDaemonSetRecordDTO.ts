/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesDaemonSetRecordDTOMeta } from './inframonitoringtypesDaemonSetRecordDTOMeta';
import type { InframonitoringtypesPodCountsByStatusDTO } from './inframonitoringtypesPodCountsByStatusDTO';

export interface InframonitoringtypesDaemonSetRecordDTO {
	/**
	 * @type integer
	 */
	currentNodes: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetCPURequest: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetMemoryRequest: number;
	/**
	 * @type string
	 */
	daemonSetName: string;
	/**
	 * @type integer
	 */
	desiredNodes: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesDaemonSetRecordDTOMeta;
	/**
	 * @type integer
	 */
	misscheduledNodes: number;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
	/**
	 * @type integer
	 */
	readyNodes: number;
}
