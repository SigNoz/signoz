/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesDaemonSetRecordDTO } from './inframonitoringtypesDaemonSetRecordDTO';
import type { InframonitoringtypesResponseTypeDTO } from './inframonitoringtypesResponseTypeDTO';
import type { Querybuildertypesv5QueryWarnDataDTO } from './querybuildertypesv5QueryWarnDataDTO';

export interface InframonitoringtypesDaemonSetsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesDaemonSetRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}
