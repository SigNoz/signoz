import { Color } from '@signozhq/design-tokens';
import type { PieSlice } from 'lib/visualization/charts/types';

export const OTHER_SLICE_LABEL = 'Other';

const MIN_SHARE = 0.01;
const MAX_SLICES = 15;
const MIN_OTHER_MEMBERS = 2;

/**
 * Folds slices into one trailing "Other" slice. Past `MAX_SLICES`, the largest `MAX_SLICES - 1`
 * always stay, so a pie of many equal slivers never collapses into a single Other; otherwise
 * slices at or under `MIN_SHARE` fold. Kept slices keep their order. No-op when fewer than two
 * would fold.
 */
export function groupPieSlices(
	slices: PieSlice[],
	isDarkMode: boolean,
): PieSlice[] {
	const total = slices.reduce((sum, slice) => sum + slice.value, 0);
	const sorted = [...slices].sort((a, b) => b.value - a.value);
	const keptCount =
		slices.length > MAX_SLICES
			? MAX_SLICES - 1
			: sorted.filter((slice) => slice.value / total > MIN_SHARE).length;

	const members = sorted.slice(keptCount);
	if (members.length < MIN_OTHER_MEMBERS) {
		return slices;
	}

	const kept = new Set(sorted.slice(0, keptCount));
	const other: PieSlice = {
		label: OTHER_SLICE_LABEL,
		value: members.reduce((sum, slice) => sum + slice.value, 0),
		color: isDarkMode ? Color.BG_SLATE_50 : Color.BG_VANILLA_400,
		members,
	};
	return [...slices.filter((slice) => kept.has(slice)), other];
}
