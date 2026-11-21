/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesAgentReportDTOData } from './cloudintegrationtypesAgentReportDTOData';
import type { CloudintegrationtypesSyncStateDTO } from './cloudintegrationtypesSyncStateDTO';

/**
 * @nullable
 */
export type CloudintegrationtypesAgentReportDTO = {
	/**
	 * @type object,null
	 */
	data: CloudintegrationtypesAgentReportDTOData;
	syncState: CloudintegrationtypesSyncStateDTO | null;
	/**
	 * @type integer
	 * @format int64
	 */
	timestampMillis: number;
} | null;
