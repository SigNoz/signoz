/** Which question the second block answers: "which group?" for a cell summed
 *  across several, "how does this bucket compare?" for one that is one series. */
export enum HeatmapTooltipBody {
	Buckets = 'buckets',
	Contribution = 'contribution',
}

export interface HeatmapBucketRow {
	label: string;
	/** `null` where the bucket has no observation in that column, never a 0. */
	count: number | null;
	isHovered: boolean;
}

export interface HeatmapContributionRow {
	label: string;
	color: string;
	count: number;
	/** Share of the cell's total, 0..100. */
	percent: number;
}
