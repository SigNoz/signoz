import type { OverflowBadgesLayout } from './types';

/**
 * How many badges fit `available` px, keeping room for the "+N" badge while any
 * are left out. Always shows at least one, capped to truncate when too wide.
 */
export const computeOverflowBadgesLayout = (
	available: number,
	gap: number,
	badgeWidths: number[],
	overflowWidth: number,
): OverflowBadgesLayout => {
	if (badgeWidths.length === 0) {
		return { visibleCount: 0 };
	}

	let used = 0;
	let visibleCount = 0;
	for (let i = 0; i < badgeWidths.length; i++) {
		const next = used + (i > 0 ? gap : 0) + badgeWidths[i];
		const reserve = i < badgeWidths.length - 1 ? gap + overflowWidth : 0;
		if (next + reserve > available) {
			break;
		}
		used = next;
		visibleCount++;
	}
	if (visibleCount > 0) {
		return { visibleCount };
	}
	const reserve = badgeWidths.length > 1 ? gap + overflowWidth : 0;
	return { visibleCount: 1, firstMaxWidth: Math.max(available - reserve, 0) };
};
