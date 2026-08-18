import { computeTickInterval, generateTicks } from '../timeAxisUtils';
import { TimeRange } from '../transformData';

describe('computeTickInterval', () => {
	it('returns 60s interval for very short ranges', () => {
		// 5 minutes / 7 ≈ 43s → snaps to 60
		expect(computeTickInterval(300)).toBe(60);
	});

	it('returns 300s (5 min) interval for ~30 min range', () => {
		// 30 min = 1800s / 7 ≈ 257 → snaps to 300
		expect(computeTickInterval(1800)).toBe(300);
	});

	it('returns 3600s (1 hour) interval for ~6 hour range', () => {
		// 6h = 21600s / 7 ≈ 3086 → snaps to 3600
		expect(computeTickInterval(21600)).toBe(3600);
	});

	it('returns 86400s (1 day) interval for ~1 week range', () => {
		// 7d = 604800s / 7 ≈ 86400 → snaps to 86400
		expect(computeTickInterval(604800)).toBe(86400);
	});

	it('returns last interval for very large ranges', () => {
		// 365 days = 31536000s / 7 ≈ 4505143 → larger than all intervals → returns 2592000
		expect(computeTickInterval(31536000)).toBe(2592000);
	});

	it('returns 60s for ranges where raw interval is exactly 60', () => {
		// 420s / 7 = 60 → snaps to 60
		expect(computeTickInterval(420)).toBe(60);
	});
});

describe('generateTicks', () => {
	const UTC = 'UTC';

	it('returns empty array for zero-duration time range', () => {
		const timeRange: TimeRange = { start: 1000, end: 1000 };
		expect(generateTicks(timeRange, 800, UTC)).toEqual([]);
	});

	it('returns empty array for negative duration time range', () => {
		const timeRange: TimeRange = { start: 2000, end: 1000 };
		expect(generateTicks(timeRange, 800, UTC)).toEqual([]);
	});

	it('returns empty array for zero width', () => {
		const timeRange: TimeRange = { start: 1000, end: 2000 };
		expect(generateTicks(timeRange, 0, UTC)).toEqual([]);
	});

	it('generates ticks with positions between 0 and 1', () => {
		// 1 hour range starting at a round hour (epoch 0 = 1970-01-01 00:00:00 UTC)
		const timeRange: TimeRange = { start: 0, end: 3600 };
		const ticks = generateTicks(timeRange, 800, UTC);

		expect(ticks.length).toBeGreaterThan(0);
		for (const tick of ticks) {
			expect(tick.position).toBeGreaterThanOrEqual(0);
			expect(tick.position).toBeLessThanOrEqual(1);
		}
	});

	it('generates ticks that are evenly spaced', () => {
		// 24h range
		const timeRange: TimeRange = { start: 0, end: 86400 };
		const ticks = generateTicks(timeRange, 1000, UTC);

		expect(ticks.length).toBeGreaterThan(1);

		// Check that spacing between consecutive ticks is equal
		for (let i = 1; i < ticks.length; i++) {
			const interval = ticks[i].timestamp - ticks[i - 1].timestamp;
			const firstInterval = ticks[1].timestamp - ticks[0].timestamp;
			expect(interval).toBe(firstInterval);
		}
	});

	it('uses time-only format for ranges < 1 day', () => {
		// 2 hour range
		const timeRange: TimeRange = { start: 0, end: 7200 };
		const ticks = generateTicks(timeRange, 800, UTC);

		expect(ticks.length).toBeGreaterThan(0);
		// HH:mm format: matches pattern like "00:05" or "01:30"
		for (const tick of ticks) {
			expect(tick.label).toMatch(/^\d{2}:\d{2}$/);
		}
	});

	it('uses date+time format for ranges between 1-7 days', () => {
		// 3 day range starting from epoch 0
		const timeRange: TimeRange = { start: 0, end: 86400 * 3 };
		const ticks = generateTicks(timeRange, 1000, UTC);

		expect(ticks.length).toBeGreaterThan(0);
		// MMM DD HH:mm format: matches pattern like "Jan 01 06:00"
		for (const tick of ticks) {
			expect(tick.label).toMatch(/^[A-Z][a-z]{2} \d{2} \d{2}:\d{2}$/);
		}
	});

	it('uses date-only format for ranges > 7 days', () => {
		// 30 day range
		const timeRange: TimeRange = { start: 0, end: 86400 * 30 };
		const ticks = generateTicks(timeRange, 1000, UTC);

		expect(ticks.length).toBeGreaterThan(0);
		// MMM DD format: matches pattern like "Jan 05"
		for (const tick of ticks) {
			expect(tick.label).toMatch(/^[A-Z][a-z]{2} \d{2}$/);
		}
	});

	it('respects timezone for label formatting', () => {
		// Midnight UTC epoch 0 formatted in UTC+5:30 should show 05:30
		const timeRange: TimeRange = { start: 0, end: 3600 };
		const ticksUTC = generateTicks(timeRange, 800, 'UTC');
		const ticksIST = generateTicks(timeRange, 800, 'Asia/Kolkata');

		// Both should produce ticks, but labels should differ
		expect(ticksUTC.length).toBeGreaterThan(0);
		expect(ticksIST.length).toBeGreaterThan(0);

		// Same timestamps → same positions
		expect(ticksUTC[0].timestamp).toBe(ticksIST[0].timestamp);
		// But labels differ due to timezone offset
		expect(ticksIST[0].label).not.toBe(ticksUTC[0].label);
	});

	it('does not produce ticks with position < 0', () => {
		// Use a start that doesn't align with any interval
		const timeRange: TimeRange = { start: 100, end: 3700 };
		const ticks = generateTicks(timeRange, 800, UTC);

		for (const tick of ticks) {
			expect(tick.position).toBeGreaterThanOrEqual(0);
		}
	});
});
