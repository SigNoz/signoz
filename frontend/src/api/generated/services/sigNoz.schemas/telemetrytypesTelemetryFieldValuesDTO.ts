/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface TelemetrytypesTelemetryFieldValuesDTO {
	/**
	 * @type array
	 * @description Distinct boolean values of the field.
	 */
	boolValues?: boolean[];
	/**
	 * @type array
	 * @description Distinct numeric values of the field, up to limit.
	 */
	numberValues?: number[];
	/**
	 * @type array
	 * @description Values of the field seen on data that also matches existingQuery, within the startUnixMilli and endUnixMilli bounds. Empty when existingQuery is not set.
	 */
	relatedValues?: string[];
	/**
	 * @type array
	 * @description Distinct string values of the field, up to limit.
	 */
	stringValues?: string[];
}
