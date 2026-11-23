/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesClusterRecordDTOCounts } from './inframonitoringtypesClusterRecordDTOCounts';
import type { InframonitoringtypesClusterRecordDTOMeta } from './inframonitoringtypesClusterRecordDTOMeta';
import type { InframonitoringtypesNodeCountsByReadinessDTO } from './inframonitoringtypesNodeCountsByReadinessDTO';
import type { InframonitoringtypesPodCountsByStatusDTO } from './inframonitoringtypesPodCountsByStatusDTO';

export interface InframonitoringtypesClusterRecordDTO {
	/**
	 * @type number
	 * @format double
	 */
	clusterCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	clusterCPUAllocatable: number;
	/**
	 * @type number
	 * @format double
	 */
	clusterMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	clusterMemoryAllocatable: number;
	/**
	 * @type string
	 */
	clusterName: string;
	/**
	 * @type object
	 */
	counts: InframonitoringtypesClusterRecordDTOCounts;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesClusterRecordDTOMeta;
	nodeCountsByReadiness: InframonitoringtypesNodeCountsByReadinessDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}
