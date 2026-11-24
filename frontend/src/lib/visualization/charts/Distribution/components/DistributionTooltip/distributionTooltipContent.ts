import { DistributionGroupColumn, DistributionTooltipRow } from './types';

/** `<1%` rather than `0%`, so a share that exists never reads as none. */
export function formatPercent(share: number): string {
	if (share > 0 && share < 0.01) {
		return '<1%';
	}
	return `${Math.round(share * 100)}%`;
}

/**
 * Names the group column after the one group-by key every group shares, showing just
 * its values; several keys or none keep the full labels. Other has no group labels and
 * keeps its own.
 */
export function resolveGroupColumn(
	groupLabels: (Record<string, string> | undefined)[],
): DistributionGroupColumn {
	const keys = new Set(
		groupLabels.flatMap((group) => {
			if (!group) {
				return [];
			}
			const groupKeys = Object.keys(group);
			return [groupKeys.length === 1 ? groupKeys[0] : ''];
		}),
	);
	const [key] = [...keys];
	if (keys.size !== 1 || !key) {
		return { heading: 'Group', format: (label) => label };
	}
	return {
		heading: key,
		format: (label, index) => groupLabels[index]?.[key] ?? label,
	};
}

/** One row per drawn group, in legend order, with its count in `bucket`. */
export function buildDistributionTooltipRows({
	labels,
	colors,
	counts,
	bucket,
	hoveredSeries,
	formatLabel,
}: {
	labels: string[];
	colors: string[];
	/** `counts[series][bucket]`. */
	counts: number[][];
	bucket: number;
	hoveredSeries: number | null;
	formatLabel: (label: string, series: number) => string;
}): DistributionTooltipRow[] {
	return labels.map((label, series) => {
		const seriesCounts = counts[series] ?? [];
		const total = seriesCounts.reduce((sum, count) => sum + count, 0);
		const count = seriesCounts[bucket] ?? 0;
		return {
			seriesIndex: series,
			label: formatLabel(label, series),
			color: colors[series],
			count,
			share: total > 0 ? count / total : 0,
			isHovered: series === hoveredSeries,
		};
	});
}
