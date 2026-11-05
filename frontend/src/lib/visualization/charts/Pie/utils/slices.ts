import type { PieSlice } from 'lib/visualization/charts/types';

/** Grouped slices read "Other (n)"; `label` stays the key for colours and visibility. */
export function getSliceDisplayLabel(slice: PieSlice): string {
	return slice.members
		? `${slice.label} (${slice.members.length})`
		: slice.label;
}

/** Arc order: largest first, with a grouped slice always last so it closes the circle. */
export function compareSlices(a: PieSlice, b: PieSlice): number {
	return Number(!!a.members) - Number(!!b.members) || b.value - a.value;
}
