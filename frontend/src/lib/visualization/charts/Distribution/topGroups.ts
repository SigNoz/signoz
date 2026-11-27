import { sum } from 'lodash-es';
import { StackMode } from 'lib/uPlotV2/config/types';
import { OTHER_GROUP_LABEL } from 'lib/visualization/charts/utils/otherGroup';

import { DistributionSeries, DistributionXAxis, DrawnGroups } from './types';

/** Colours stop being told apart past this many groups side by side. */
export const MAX_SIDE_BY_SIDE_GROUPS = 10;
/** Narrowest a side-by-side bar may get, in CSS pixels. */
const MIN_SIDE_BY_SIDE_BAR_PX = 3;

/**
 * How many series fit: every one when stacked, since a stack never narrows its bars;
 * side by side, as many as keep every bar in the narrowest bucket at least
 * `MIN_SIDE_BY_SIDE_BAR_PX` wide, up to `MAX_SIDE_BY_SIDE_GROUPS`.
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
		return Number.POSITIVE_INFINITY;
	}
	const span = xAxis.max - xAxis.min;
	let narrowest = Number.POSITIVE_INFINITY;
	for (let index = 0; index + 1 < xAxis.edges.length; index += 1) {
		if (xAxis.edges[index] < xAxis.max) {
			narrowest = Math.min(narrowest, xAxis.edges[index + 1] - xAxis.edges[index]);
		}
	}
	if (!(span > 0) || !Number.isFinite(narrowest)) {
		return MAX_SIDE_BY_SIDE_GROUPS;
	}
	const narrowestPx = (plotWidth * narrowest) / span;
	return Math.min(
		MAX_SIDE_BY_SIDE_GROUPS,
		Math.max(1, Math.floor(narrowestPx / MIN_SIDE_BY_SIDE_BAR_PX)),
	);
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
			sourceIndexes: visibleIndexes,
			otherSourceIndexes: [],
			visibleGroupCount: visibleIndexes.length,
		};
	}

	const ranked = [...visibleIndexes].sort(
		(a, b) => sum(counts[b]) - sum(counts[a]) || a - b,
	);
	const keptCount = Math.max(0, maxGroups - 1);
	const keep = new Set(ranked.slice(0, keptCount));
	const kept = visibleIndexes.filter((index) => keep.has(index));
	const folded = ranked.slice(keptCount);
	const bucketCount = Math.max(...folded.map((index) => counts[index].length));
	const other = Array.from({ length: bucketCount }, (_, bucket) =>
		folded.reduce((total, index) => total + (counts[index][bucket] ?? 0), 0),
	);

	return {
		labels: [...kept.map((index) => labels[index]), OTHER_GROUP_LABEL],
		counts: [...kept.map((index) => counts[index]), other],
		colors: [...kept.map((index) => colors[index]), otherColor],
		sourceIndexes: [...kept, null],
		otherSourceIndexes: folded,
		visibleGroupCount: visibleIndexes.length,
	};
}

/**
 * The drawn group at `drawnIndex` as a source series and its colour; `null` for Other,
 * which sums several groups no single filter can name.
 */
export function resolveClickedGroup(
	drawn: DrawnGroups,
	drawnIndex: number | null,
	series: DistributionSeries[],
): { series: DistributionSeries; color: string } | null {
	const source =
		drawnIndex === null ? null : (drawn.sourceIndexes[drawnIndex] ?? null);
	if (drawnIndex === null || source === null) {
		return null;
	}
	return { series: series[source], color: drawn.colors[drawnIndex] };
}
