/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesHostRecordDTOMeta } from './inframonitoringtypesHostRecordDTOMeta';
import type { InframonitoringtypesHostStatusDTO } from './inframonitoringtypesHostStatusDTO';

export interface InframonitoringtypesHostRecordDTO {
	/**
	 * @type integer
	 */
	activeHostCount: number;
	/**
	 * @type number
	 * @format double
	 */
	cpu: number;
	/**
	 * @type number
	 * @format double
	 */
	diskUsage: number;
	/**
	 * @type string
	 */
	hostName: string;
	/**
	 * @type integer
	 */
	inactiveHostCount: number;
	/**
	 * @type number
	 * @format double
	 */
	load15: number;
	/**
	 * @type number
	 * @format double
	 */
	memory: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesHostRecordDTOMeta;
	status: InframonitoringtypesHostStatusDTO;
	/**
	 * @type number
	 * @format double
	 */
	wait: number;
}
