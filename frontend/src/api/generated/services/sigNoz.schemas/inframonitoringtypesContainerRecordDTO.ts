/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesContainerCountsByReadyDTO } from './inframonitoringtypesContainerCountsByReadyDTO';
import type { InframonitoringtypesContainerCountsByStatusDTO } from './inframonitoringtypesContainerCountsByStatusDTO';
import type { InframonitoringtypesContainerReadyDTO } from './inframonitoringtypesContainerReadyDTO';
import type { InframonitoringtypesContainerRecordDTOMeta } from './inframonitoringtypesContainerRecordDTOMeta';
import type { InframonitoringtypesContainerStatusDTO } from './inframonitoringtypesContainerStatusDTO';

export interface InframonitoringtypesContainerRecordDTO {
	containerCountsByReady: InframonitoringtypesContainerCountsByReadyDTO;
	containerCountsByStatus: InframonitoringtypesContainerCountsByStatusDTO;
	/**
	 * @type string
	 */
	containerName: string;
	/**
	 * @type number
	 * @format double
	 */
	cpu: number;
	/**
	 * @type number
	 * @format double
	 */
	cpuLimitUtilization: number;
	/**
	 * @type number
	 * @format double
	 */
	cpuRequestUtilization: number;
	/**
	 * @type number
	 * @format double
	 */
	memory: number;
	/**
	 * @type number
	 * @format double
	 */
	memoryLimitUtilization: number;
	/**
	 * @type number
	 * @format double
	 */
	memoryRequestUtilization: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesContainerRecordDTOMeta;
	/**
	 * @type string
	 */
	podUID: string;
	ready: InframonitoringtypesContainerReadyDTO;
	/**
	 * @type integer
	 * @format int64
	 */
	restarts: number;
	status: InframonitoringtypesContainerStatusDTO;
}
