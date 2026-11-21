/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { TelemetrytypesTelemetryFieldValuesDTO } from './telemetrytypesTelemetryFieldValuesDTO';

export interface TelemetrytypesGettableFieldValuesDTO {
	/**
	 * @type boolean
	 * @description True when every matching value was returned; false when the result was cut off by limit.
	 */
	complete: boolean;
	/**
	 * @description Distinct values of the key, split by data type.
	 */
	values: TelemetrytypesTelemetryFieldValuesDTO;
}
