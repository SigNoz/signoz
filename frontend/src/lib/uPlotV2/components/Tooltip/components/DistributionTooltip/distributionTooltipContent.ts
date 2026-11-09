import { DistributionBucket, DistributionTooltipRow } from './types';

/** `(250 ms, 500 ms]`; the open-ended buckets name their one real bound. */
export function formatBucketRange(
	bucket: DistributionBucket,
	formatBound: (value: number) => string,
): string {
	if (bucket.isOverflow) {
		return `> ${formatBound(bucket.lower)}`;
	}
	if (bucket.isUnderflow) {
		return `≤ ${formatBound(bucket.upper)}`;
	}
	return `(${formatBound(bucket.lower)}, ${formatBound(bucket.upper)}]`;
}

/** `<1%` rather than `0%`, so a share that exists never reads as none. */
export function formatPercent(share: number): string {
	if (share > 0 && share < 0.01) {
		return '<1%';
	}
	return `${Math.round(share * 100)}%`;
}

/** One row per visible group with its count in `bucket`. */
export function buildDistributionTooltipRows({
	labels,
	colors,
	counts,
	visible,
	bucket,
	hoveredSeries,
}: {
	labels: string[];
	colors: string[];
	counts: number[][];
	visible: boolean[];
	bucket: number;
	hoveredSeries: number | null;
}): DistributionTooltipRow[] {
	return labels.flatMap((label, series) => {
		if (!visible[series]) {
			return [];
		}
		const seriesCounts = counts[series] ?? [];
		let total = 0;
		let atOrBelow = 0;
		seriesCounts.forEach((count, index) => {
			total += count;
			if (index <= bucket) {
				atOrBelow += count;
			}
		});
		const count = seriesCounts[bucket] ?? 0;
		return [
			{
				label,
				color: colors[series],
				count,
				share: total > 0 ? count / total : 0,
				cumulativeShare: total > 0 ? atOrBelow / total : 0,
				isHovered: series === hoveredSeries,
			},
		];
	});
}
