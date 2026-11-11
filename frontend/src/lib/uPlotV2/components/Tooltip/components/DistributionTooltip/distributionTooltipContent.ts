import { DistributionGroupColumn, DistributionTooltipRow } from './types';

const SINGLE_LABEL = /^\{([^=,]+)="([^"]*)"\}$/;

/** `<1%` rather than `0%`, so a share that exists never reads as none. */
export function formatPercent(share: number): string {
	if (share > 0 && share < 0.01) {
		return '<1%';
	}
	return `${Math.round(share * 100)}%`;
}

/**
 * Names the group column after the one group-by key every label shares, showing just
 * its values; anything else (several keys, Other) keeps the full labels.
 */
export function resolveGroupColumn(labels: string[]): DistributionGroupColumn {
	const keys = new Set<string>();
	labels.forEach((label) => {
		keys.add(SINGLE_LABEL.exec(label)?.[1] ?? '');
	});
	const [key] = [...keys];
	if (keys.size !== 1 || !key) {
		return { heading: 'Group', format: (label) => label };
	}
	return {
		heading: key,
		format: (label) => SINGLE_LABEL.exec(label)?.[2] ?? label,
	};
}

/** One row per visible group, in legend order, with its count in `bucket`. */
export function buildDistributionTooltipRows({
	labels,
	colors,
	counts,
	visible,
	bucket,
	hoveredSeries,
	formatLabel,
}: {
	labels: string[];
	colors: string[];
	/** `counts[series][bucket]`. */
	counts: number[][];
	visible: boolean[];
	bucket: number;
	hoveredSeries: number | null;
	formatLabel: (label: string) => string;
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
				label: formatLabel(label),
				color: colors[series],
				count,
				share: total > 0 ? count / total : 0,
				cumulativeShare: total > 0 ? atOrBelow / total : 0,
				isHovered: series === hoveredSeries,
			},
		];
	});
}
