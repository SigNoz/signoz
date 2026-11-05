import type { PieSlice } from 'lib/visualization/charts/types';

/** Grouped slices read "Other (n)"; `label` stays the key for colours and visibility. */
export function getSliceDisplayLabel(slice: PieSlice): string {
	return slice.groupedMembers
		? `${slice.label} (${slice.groupedMembers.length})`
		: slice.label;
}

/** Arc order: largest first, with a grouped slice always last so it closes the circle. */
export function compareSlices(a: PieSlice, b: PieSlice): number {
	return (
		Number(!!a.groupedMembers) - Number(!!b.groupedMembers) || b.value - a.value
	);
}
