/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { TelemetrytypesFieldContextDTO } from './telemetrytypesFieldContextDTO';
import type { TelemetrytypesFieldDataTypeDTO } from './telemetrytypesFieldDataTypeDTO';

export type GetAIObservabilityFieldsKeysParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	searchText?: string;
	/**
	 * @description undefined
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description undefined
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	endUnixMilli?: number;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
};
