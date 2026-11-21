/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { TelemetrytypesFieldContextDTO } from './telemetrytypesFieldContextDTO';
import type { TelemetrytypesFieldDataTypeDTO } from './telemetrytypesFieldDataTypeDTO';
import type { TelemetrytypesSignalDTO } from './telemetrytypesSignalDTO';

export interface Querybuildertypesv5OrderByKeyDTO {
	/**
	 * @type string
	 * @description Human-readable summary of the field, present only for well-known fields.
	 */
	description?: string;
	/**
	 * @description Where the field lives: resource, attribute, scope, span, trace, log, body or metric. Empty means unspecified, so the server resolves it.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Data type of the field values: string, bool, int64, float64 or number. Empty means unspecified.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description The field name, such as service.name, k8s.pod.name or http.response.status_code. Dots are part of the name, and the names available depend on the signal and the data ingested.
	 */
	name: string;
	/**
	 * @description The signal the field belongs to: traces, logs or metrics. Empty means any signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 * @description Unit of the field values, present only for well-known fields.
	 */
	unit?: string;
}
