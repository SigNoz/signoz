/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesResponseTypeDTO } from './inframonitoringtypesResponseTypeDTO';
import type { InframonitoringtypesStatefulSetRecordDTO } from './inframonitoringtypesStatefulSetRecordDTO';
import type { Querybuildertypesv5QueryWarnDataDTO } from './querybuildertypesv5QueryWarnDataDTO';

export interface InframonitoringtypesStatefulSetsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesStatefulSetRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}
