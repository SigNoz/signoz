/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { TelemetrytypesGettableFieldKeysDTOKeys } from './telemetrytypesGettableFieldKeysDTOKeys';

export interface TelemetrytypesGettableFieldKeysDTO {
	/**
	 * @type boolean
	 * @description True when every matching key was returned; false when the result was cut off by limit.
	 */
	complete: boolean;
	/**
	 * @type object,null
	 * @description Matching keys grouped by name. A name maps to several entries when it exists in more than one context or data type.
	 */
	keys: TelemetrytypesGettableFieldKeysDTOKeys;
}
