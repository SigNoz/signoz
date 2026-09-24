import {
	getIntervals,
	getIntervalUnit,
	getMinimumIntervalsBasedOnWidth,
} from '../utils';

// A tick label looks like "200.00ms" / "1.10s" — grab the trailing unit name.
function unitOfLabel(label: string): string {
	const match = label.match(/[a-z]+$/i);
	return match ? match[0] : '';
}

describe('getMinimumIntervalsBasedOnWidth', () => {
	it('returns fewer intervals for narrower rulers', () => {
		expect(getMinimumIntervalsBasedOnWidth(500)).toBe(3);
		expect(getMinimumIntervalsBasedOnWidth(700)).toBe(4);
		expect(getMinimumIntervalsBasedOnWidth(900)).toBe(5);
		expect(getMinimumIntervalsBasedOnWidth(1200)).toBe(6);
	});
});

describe('getIntervalUnit', () => {
	it('selects the unit from the interval spread', () => {
		expect(getIntervalUnit(130, 0).name).toBe('ms');
		expect(getIntervalUnit(1100, 0).name).toBe('s');
		expect(getIntervalUnit(70_000, 0).name).toBe('m');
	});

	it('accounts for a large offset (deep-zoom labels stay readable)', () => {
		// Cursor spread is tiny but the window starts 5,000,000ms into the trace.
		expect(getIntervalUnit(100, 5_000_000).name).toBe('hr');
	});

	// Regression: the interval COUNT changes the chosen unit, so the crosshair
	// badge must use the same width-derived count as the ticks. On a 5.5s trace a
	// narrow ruler (5 intervals → 1100ms → "s") and a wide one (6 intervals →
	// 916ms → "ms") pick different units.
	it('can resolve to different units for the same spread at different counts', () => {
		const spread = 5500;
		expect(getIntervalUnit(spread / 5, 0).name).toBe('s');
		expect(getIntervalUnit(spread / 6, 0).name).toBe('ms');
	});
});

describe('badge/tick unit consistency', () => {
	// The invariant the fix guarantees: when the badge and the ticks are fed the
	// same width-derived intervalSpread, every tick label uses the badge's unit.
	it.each([
		{ spread: 1287, width: 900 },
		{ spread: 5500, width: 900 }, // narrow → 5 intervals, the mismatch case
		{ spread: 5500, width: 1200 }, // wide → 6 intervals
		{ spread: 120_000, width: 700 },
	])('spread=$spread width=$width', ({ spread, width }) => {
		const minIntervals = getMinimumIntervalsBasedOnWidth(width);
		const intervalSpread = spread / minIntervals;
		const badgeUnit = getIntervalUnit(intervalSpread, 0).name;
		const intervals = getIntervals(intervalSpread, spread, 0);

		intervals.forEach((interval) => {
			expect(unitOfLabel(interval.label)).toBe(badgeUnit);
		});
	});
});
