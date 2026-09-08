import { formatColumnRange } from '../heatmapTooltipContent';

const TIMEZONE = 'UTC';
/** 2026-09-02T05:30:00Z. */
const START = 1_788_327_000;

describe('formatColumnRange', () => {
	it('dates both ends of the column', () => {
		expect(
			formatColumnRange({ start: START, step: 9 * 3600, timezone: TIMEZONE }),
		).toBe('09/02 05:30 → 09/02 14:30');
	});

	it('carries the date across a column that spans days', () => {
		expect(
			formatColumnRange({ start: START, step: 2 * 86_400, timezone: TIMEZONE }),
		).toBe('09/02 05:30 → 09/04 05:30');
	});

	it('adds seconds for a sub-minute column, which times alone cannot separate', () => {
		expect(
			formatColumnRange({ start: START, step: 30, timezone: TIMEZONE }),
		).toBe('09/02 05:30:00 → 09/02 05:30:30');
	});

	it('reads the day in the panel timezone, not UTC', () => {
		// 05:30Z is the previous evening in Los Angeles, so the same column reads as
		// crossing a date boundary there and not in UTC.
		expect(
			formatColumnRange({
				start: START,
				step: 9 * 3600,
				timezone: 'America/Los_Angeles',
			}),
		).toBe('09/01 22:30 → 09/02 07:30');
	});
});
