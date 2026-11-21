/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesNodeRecordDTO } from './inframonitoringtypesNodeRecordDTO';
import type { InframonitoringtypesResponseTypeDTO } from './inframonitoringtypesResponseTypeDTO';
import type { Querybuildertypesv5QueryWarnDataDTO } from './querybuildertypesv5QueryWarnDataDTO';

export interface InframonitoringtypesNodesDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesNodeRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}
