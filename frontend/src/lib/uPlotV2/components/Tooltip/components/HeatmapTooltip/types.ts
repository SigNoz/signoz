/** Which question the second block answers: "which group?" for a cell summed
 *  across several, "how does this bucket compare?" for one that is one series. */
export enum HeatmapTooltipBody {
	Buckets = 'buckets',
	Contribution = 'contribution',
}

export interface HeatmapBucketRow {
	/** The bucket's row on the y axis. Labels are not unique — two boundaries can
	 *  round to the same text — so this is what identifies a row. */
	row: number;
	label: string;
	/** `null` where the bucket has no observation in that column, never a 0. */
	count: number | null;
	isHovered: boolean;
}

export interface HeatmapContributionRow {
	label: string;
	color: string;
	count: number;
	/** Fraction of the cell this group contributed, 0..1. */
	share: number;
}
