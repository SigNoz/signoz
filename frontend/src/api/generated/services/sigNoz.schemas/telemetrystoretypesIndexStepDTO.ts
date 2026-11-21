/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface TelemetrystoretypesIndexStepDTO {
	/**
	 * @type string
	 */
	condition: string;
	/**
	 * @type integer
	 * @format int64
	 */
	initialGranules: number;
	/**
	 * @type integer
	 * @format int64
	 */
	initialParts: number;
	/**
	 * @type array
	 */
	keys: string[];
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type integer
	 * @format int64
	 */
	selectedGranules: number;
	/**
	 * @type integer
	 * @format int64
	 */
	selectedParts: number;
	/**
	 * @type string
	 */
	type: string;
}
