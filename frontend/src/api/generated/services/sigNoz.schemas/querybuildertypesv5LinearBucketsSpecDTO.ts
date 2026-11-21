/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface Querybuildertypesv5LinearBucketsSpecDTO {
	/**
	 * @type number
	 * @format double
	 * @description The upper bound of the last regular band; values above it are counted in a trailing overflow band.
	 */
	maxValue: number;
	/**
	 * @type integer
	 * @description The number of evenly spaced bands between 0 and maxValue. A default applies when omitted or 0.
	 */
	numBuckets?: number;
}
