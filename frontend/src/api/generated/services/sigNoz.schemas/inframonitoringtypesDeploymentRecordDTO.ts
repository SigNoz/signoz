/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesDeploymentRecordDTOMeta } from './inframonitoringtypesDeploymentRecordDTOMeta';
import type { InframonitoringtypesPodCountsByStatusDTO } from './inframonitoringtypesPodCountsByStatusDTO';

export interface InframonitoringtypesDeploymentRecordDTO {
	/**
	 * @type integer
	 */
	availablePods: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentCPURequest: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentMemoryRequest: number;
	/**
	 * @type string
	 */
	deploymentName: string;
	/**
	 * @type integer
	 */
	desiredPods: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesDeploymentRecordDTOMeta;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}
