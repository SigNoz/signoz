/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesPodCountsByStatusDTO } from './inframonitoringtypesPodCountsByStatusDTO';
import type { InframonitoringtypesPodRecordDTOMeta } from './inframonitoringtypesPodRecordDTOMeta';
import type { InframonitoringtypesPodStatusDTO } from './inframonitoringtypesPodStatusDTO';

export interface InframonitoringtypesPodRecordDTO {
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesPodRecordDTOMeta;
	/**
	 * @type integer
	 * @format int64
	 */
	podAge: number;
	/**
	 * @type number
	 * @format double
	 */
	podCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	podCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	podCPURequest: number;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
	/**
	 * @type number
	 * @format double
	 */
	podMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	podMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	podMemoryRequest: number;
	/**
	 * @type integer
	 * @format int64
	 */
	podRestarts: number;
	podStatus: InframonitoringtypesPodStatusDTO;
	/**
	 * @type string
	 */
	podUID: string;
}
