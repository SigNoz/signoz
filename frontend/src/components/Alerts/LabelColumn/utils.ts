export const OVERFLOW_BADGE_WIDTH = 40;

/**
 * How many leading labels fit in `available` px, reserving room for the `+N` badge
 * whenever some are left out. At least one label is always shown.
 */
export function getVisibleCount(
	widths: number[],
	available: number,
	gap: number,
): number {
	const total = widths.reduce(
		(sum, width, index) => sum + width + (index > 0 ? gap : 0),
		0,
	);
	if (total <= available) {
		return widths.length;
	}

	const limit = available - OVERFLOW_BADGE_WIDTH - gap;
	let used = 0;
	let count = 0;

	for (const width of widths) {
		used += width + (count > 0 ? gap : 0);
		if (used > limit) {
			break;
		}
		count++;
	}

	return Math.max(1, count);
}
