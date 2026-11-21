/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface MetrictypesComparisonSpaceAggregationParamDTO {
	/**
	 * @type string
	 * @description Comparison applied to histogram bucket bounds when spaceAggregation is count: <= gives the estimated count of observations at or below threshold, > the estimated count above it.
	 */
	operator: string;
	/**
	 * @type number
	 * @format double
	 * @description Bucket bound the comparison uses, in the unit of the histogram metric. The count is exact when threshold equals one of the metric's le bucket bounds, and otherwise an estimate interpolated linearly between the two nearest bounds.
	 */
	threshold: number;
}
