import type { TimeRange } from '../../types';
import { computeTickInterval, generateTicks } from '../timeAxisUtils';

describe('computeTickInterval', () => {
	it('returns 60s interval for very short ranges', () => {
		// 5 minutes / 7 ≈ 43s → snaps to 60
		expect(computeTickInterval(300)).toBe(60);
	});

	it('returns 300s (5 min) interval for ~30 min range', () => {
		expect(computeTickInterval(1800)).toBe(300);
	});

	it('returns 3600s (1 hour) interval for ~6 hour range', () => {
		expect(computeTickInterval(21600)).toBe(3600);
	});

	it('returns 86400s (1 day) interval for ~1 week range', () => {
		expect(computeTickInterval(604800)).toBe(86400);
	});

	it('returns the last interval for very large ranges', () => {
		expect(computeTickInterval(31536000)).toBe(2592000);
	});

	it('returns 60s for ranges where raw interval is exactly 60', () => {
		expect(computeTickInterval(420)).toBe(60);
	});
});

describe('generateTicks', () => {
	const UTC = 'UTC';

	it('returns empty array for zero-duration time range', () => {
		const timeRange: TimeRange = { start: 1000, end: 1000 };
		expect(generateTicks(timeRange, 800, UTC)).toStrictEqual([]);
	});

	it('returns empty array for negative duration time range', () => {
		const timeRange: TimeRange = { start: 2000, end: 1000 };
		expect(generateTicks(timeRange, 800, UTC)).toStrictEqual([]);
	});

	it('returns empty array for zero width', () => {
		const timeRange: TimeRange = { start: 1000, end: 2000 };
		expect(generateTicks(timeRange, 0, UTC)).toStrictEqual([]);
	});

	it('generates ticks with positions between 0 and 1', () => {
		const timeRange: TimeRange = { start: 0, end: 3600 };
		const ticks = generateTicks(timeRange, 800, UTC);
		expect(ticks.length).toBeGreaterThan(0);
		ticks.forEach((tick) => {
			expect(tick.position).toBeGreaterThanOrEqual(0);
			expect(tick.position).toBeLessThanOrEqual(1);
		});
	});

	it('generates evenly spaced ticks', () => {
		const timeRange: TimeRange = { start: 0, end: 86400 };
		const ticks = generateTicks(timeRange, 1000, UTC);
		expect(ticks.length).toBeGreaterThan(1);
		const firstInterval = ticks[1].timestamp - ticks[0].timestamp;
		for (let i = 1; i < ticks.length; i++) {
			expect(ticks[i].timestamp - ticks[i - 1].timestamp).toBe(firstInterval);
		}
	});

	it('uses time-only format for ranges < 1 day', () => {
		const timeRange: TimeRange = { start: 0, end: 7200 };
		const ticks = generateTicks(timeRange, 800, UTC);
		expect(ticks.length).toBeGreaterThan(0);
		ticks.forEach((tick) => expect(tick.label).toMatch(/^\d{2}:\d{2}$/));
	});

	it('uses date+time format for ranges between 1-7 days', () => {
		const timeRange: TimeRange = { start: 0, end: 86400 * 3 };
		const ticks = generateTicks(timeRange, 1000, UTC);
		expect(ticks.length).toBeGreaterThan(0);
		ticks.forEach((tick) =>
			expect(tick.label).toMatch(/^[A-Z][a-z]{2} \d{2} \d{2}:\d{2}$/),
		);
	});

	it('uses date-only format for ranges > 7 days', () => {
		const timeRange: TimeRange = { start: 0, end: 86400 * 30 };
		const ticks = generateTicks(timeRange, 1000, UTC);
		expect(ticks.length).toBeGreaterThan(0);
		ticks.forEach((tick) => expect(tick.label).toMatch(/^[A-Z][a-z]{2} \d{2}$/));
	});

	it('respects timezone for label formatting', () => {
		const timeRange: TimeRange = { start: 0, end: 3600 };
		const ticksUTC = generateTicks(timeRange, 800, 'UTC');
		const ticksIST = generateTicks(timeRange, 800, 'Asia/Kolkata');
		expect(ticksUTC.length).toBeGreaterThan(0);
		expect(ticksIST.length).toBeGreaterThan(0);
		expect(ticksUTC[0].timestamp).toBe(ticksIST[0].timestamp);
		expect(ticksIST[0].label).not.toBe(ticksUTC[0].label);
	});

	it('does not produce ticks with position < 0', () => {
		const timeRange: TimeRange = { start: 100, end: 3700 };
		const ticks = generateTicks(timeRange, 800, UTC);
		ticks.forEach((tick) => expect(tick.position).toBeGreaterThanOrEqual(0));
	});
});
