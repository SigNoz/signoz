import type { PieSlice } from 'lib/visualization/charts/types';
import {
	OTHER_GROUP_LABEL,
	resolveOtherColor,
} from 'lib/visualization/charts/utils/otherGroup';

const MIN_SHARE = 0.01;
const MAX_SLICES = 15;
const MIN_OTHER_MEMBERS = 2;

/**
 * Folds slices at or under `MIN_SHARE`, plus any past `MAX_SLICES` (Other included), into one
 * trailing "Other" slice. When no slice clears `MIN_SHARE`, the largest `MAX_SLICES - 1` stay so
 * the pie never collapses into a single Other. Kept slices keep their order. No-op when fewer
 * than two would fold.
 */
export function groupPieSlices(
	slices: PieSlice[],
	isDarkMode: boolean,
): PieSlice[] {
	const total = slices.reduce((sum, slice) => sum + slice.value, 0);
	const sorted = [...slices].sort((a, b) => b.value - a.value);
	const aboveShare = sorted.filter(
		(slice) => slice.value / total > MIN_SHARE,
	).length;
	const keptCount = Math.min(aboveShare || MAX_SLICES - 1, MAX_SLICES - 1);

	const groupedMembers = sorted.slice(keptCount);
	if (groupedMembers.length < MIN_OTHER_MEMBERS) {
		return slices;
	}

	const kept = new Set(sorted.slice(0, keptCount));
	const other: PieSlice = {
		label: OTHER_GROUP_LABEL,
		value: groupedMembers.reduce((sum, slice) => sum + slice.value, 0),
		color: resolveOtherColor(isDarkMode),
		groupedMembers,
	};
	return [...slices.filter((slice) => kept.has(slice)), other];
}
