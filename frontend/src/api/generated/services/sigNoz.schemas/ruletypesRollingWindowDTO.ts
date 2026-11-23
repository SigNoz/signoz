/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface RuletypesRollingWindowDTO {
	/**
	 * @type string
	 * @description The sliding lookback window each evaluation queries, as a Go duration such as 5m.
	 */
	evalWindow: string;
	/**
	 * @type string
	 * @description How often the rule is evaluated, as a Go duration such as 1m. Must be positive.
	 */
	frequency: string;
}
