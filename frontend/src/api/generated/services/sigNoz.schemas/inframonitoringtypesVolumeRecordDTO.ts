/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesVolumeRecordDTOMeta } from './inframonitoringtypesVolumeRecordDTOMeta';

export interface InframonitoringtypesVolumeRecordDTO {
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesVolumeRecordDTOMeta;
	/**
	 * @type string
	 */
	persistentVolumeClaimName: string;
	/**
	 * @type number
	 * @format double
	 */
	volumeAvailable: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeCapacity: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeInodes: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeInodesFree: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeInodesUsed: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeUsage: number;
}
