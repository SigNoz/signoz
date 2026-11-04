import { StackMode } from 'lib/uPlotV2/config/types';

import { DistributionXAxis } from './types';

/** Colours stop being told apart past this many stacked groups. */
export const MAX_STACKED_GROUPS = 10;
/** Narrowest a side-by-side bar may get, in CSS pixels. */
const MIN_SIDE_BY_SIDE_BAR_PX = 3;
export const OTHER_GROUP_LABEL = 'Other';

/**
 * How many series fit: a fixed cap when stacked, and side by side as many as keep
 * every bar in the narrowest bucket at least `MIN_SIDE_BY_SIDE_BAR_PX` wide.
 */
export function resolveMaxDrawnGroups({
	stack,
	xAxis,
	plotWidth,
}: {
	stack: StackMode;
	xAxis: DistributionXAxis;
	/** Approximate width of the plotting area, in CSS pixels. */
	plotWidth: number;
}): number {
	if (stack !== StackMode.None) {
		return MAX_STACKED_GROUPS;
	}
	const span = xAxis.max - xAxis.min;
	let narrowest = Number.POSITIVE_INFINITY;
	for (let index = 0; index + 1 < xAxis.edges.length; index += 1) {
		if (xAxis.edges[index] < xAxis.max) {
			narrowest = Math.min(narrowest, xAxis.edges[index + 1] - xAxis.edges[index]);
		}
	}
	if (!(span > 0) || !Number.isFinite(narrowest)) {
		return MAX_STACKED_GROUPS;
	}
	const narrowestPx = (plotWidth * narrowest) / span;
	return Math.min(
		MAX_STACKED_GROUPS,
		Math.max(1, Math.floor(narrowestPx / MIN_SIDE_BY_SIDE_BAR_PX)),
	);
}

export interface DrawnGroups {
	labels: string[];
	counts: number[][];
	colors: string[];
	/** Visible groups summed into the Other series; 0 when none were. */
	otherGroupCount: number;
	/** Visible groups in all, drawn or folded. */
	visibleGroupCount: number;
}

function sum(counts: number[]): number {
	return counts.reduce((total, count) => total + count, 0);
}

/**
 * The visible groups to draw: all of them when they fit, else the largest by total
 * and one Other series summing the rest. Exact, because bucket counts add. Drawn
 * groups keep legend order.
 */
export function groupIntoOther({
	labels,
	counts,
	colors,
	visible,
	maxGroups,
	otherColor,
}: {
	labels: string[];
	counts: number[][];
	colors: string[];
	visible: boolean[];
	maxGroups: number;
	otherColor: string;
}): DrawnGroups {
	const visibleIndexes = labels
		.map((_, index) => index)
		.filter((index) => visible[index]);

	if (visibleIndexes.length <= maxGroups) {
		return {
			labels: visibleIndexes.map((index) => labels[index]),
			counts: visibleIndexes.map((index) => counts[index]),
			colors: visibleIndexes.map((index) => colors[index]),
			otherGroupCount: 0,
			visibleGroupCount: visibleIndexes.length,
		};
	}

	const keep = new Set(
		[...visibleIndexes]
			.sort((a, b) => sum(counts[b]) - sum(counts[a]) || a - b)
			.slice(0, Math.max(0, maxGroups - 1)),
	);
	const kept = visibleIndexes.filter((index) => keep.has(index));
	const folded = visibleIndexes.filter((index) => !keep.has(index));
	const bucketCount = Math.max(...folded.map((index) => counts[index].length));
	const other = Array.from({ length: bucketCount }, (_, bucket) =>
		folded.reduce((total, index) => total + (counts[index][bucket] ?? 0), 0),
	);

	return {
		labels: [...kept.map((index) => labels[index]), OTHER_GROUP_LABEL],
		counts: [...kept.map((index) => counts[index]), other],
		colors: [...kept.map((index) => colors[index]), otherColor],
		otherGroupCount: folded.length,
		visibleGroupCount: visibleIndexes.length,
	};
}
