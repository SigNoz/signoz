import type { TooltipContentItem } from 'lib/uPlotV2/components/types';

import { DistributionOtherMember, DistributionOtherMemberItem } from './types';

/**
 * Shows the value of the one group-by key every group shares instead of the full
 * label; several keys or none keep the full labels, and so does Other.
 */
export function resolveGroupLabelFormat(
	groupLabels: (Record<string, string> | undefined)[],
): (label: string, labels: Record<string, string> | undefined) => string {
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
		return (label) => label;
	}
	return (label, labels) => labels?.[key] ?? label;
}

function toItem(
	label: string,
	color: string,
	count: number,
	isActive: boolean,
): TooltipContentItem {
	return {
		label,
		value: count,
		tooltipValue: count.toLocaleString(),
		color,
		isActive,
	};
}

const byValueDesc = (a: { value: number }, b: { value: number }): number =>
	b.value - a.value;

/**
 * Every drawn group's item for `bucket`, largest first, as the time-series tooltip
 * sorts; the hovered one is also returned as `active`.
 */
export function buildDistributionTooltipItems({
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
}): { active: TooltipContentItem | null; items: TooltipContentItem[] } {
	const items = labels.map((label, series) =>
		toItem(
			formatLabel(label, series),
			colors[series],
			counts[series]?.[bucket] ?? 0,
			series === hoveredSeries,
		),
	);
	return {
		active: items.find((item) => item.isActive) ?? null,
		items: [...items].sort(byValueDesc),
	};
}

/** Every member of Other with its count in `bucket`, largest first. */
export function buildOtherMemberItems({
	members,
	bucket,
	formatLabel,
}: {
	members: DistributionOtherMember[];
	bucket: number;
	formatLabel: (
		label: string,
		labels: Record<string, string> | undefined,
	) => string;
}): DistributionOtherMemberItem[] {
	return members
		.map((member) => ({
			sourceIndex: member.sourceIndex,
			item: toItem(
				formatLabel(member.label, member.groupLabels),
				member.color,
				member.counts[bucket] ?? 0,
				false,
			),
		}))
		.sort((a, b) => byValueDesc(a.item, b.item));
}
