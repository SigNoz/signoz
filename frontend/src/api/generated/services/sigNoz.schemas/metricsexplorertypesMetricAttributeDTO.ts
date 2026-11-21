/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface MetricsexplorertypesMetricAttributeDTO {
	/**
	 * @type string
	 * @description The attribute (label) name.
	 */
	key: string;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Total number of distinct values observed, which can exceed the length of values.
	 */
	valueCount: number;
	/**
	 * @type array,null
	 * @description Distinct values observed for the attribute, capped at 1000.
	 */
	values: string[] | null;
}
