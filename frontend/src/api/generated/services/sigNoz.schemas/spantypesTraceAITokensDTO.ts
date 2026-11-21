/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface SpantypesTraceAITokensDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	cacheRead: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	cacheWrite: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	input: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	output: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	reasoning: number;
}
