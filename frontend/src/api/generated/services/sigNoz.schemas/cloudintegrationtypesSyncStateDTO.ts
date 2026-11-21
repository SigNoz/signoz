/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { CloudintegrationtypesSyncStateDTORegions } from './cloudintegrationtypesSyncStateDTORegions';

/**
 * @nullable
 */
export type CloudintegrationtypesSyncStateDTO = {
	/**
	 * @type boolean
	 */
	inSync: boolean;
	/**
	 * @type object
	 */
	regions: CloudintegrationtypesSyncStateDTORegions;
	/**
	 * @type integer
	 * @format int64
	 */
	version: number;
} | null;
