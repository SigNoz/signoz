// Feature: state-timeline-panel, Property 5: Time axis ticks are evenly spaced and aligned with segment boundaries
// **Validates: Requirements 5.2, 5.5**

import * as fc from 'fast-check';

import { computeTickInterval, generateTicks } from '../timeAxisUtils';
import { TimeRange } from '../transformData';

/**
 * The predefined human-friendly intervals used by computeTickInterval.
 * Replicated here for property verification.
 */
const INTERVALS = [
	60, // 1 min
	300, // 5 min
	600, // 10 min
	900, // 15 min
	1800, // 30 min
	3600, // 1 hour
	7200, // 2 hours
	14400, // 4 hours
	21600, // 6 hours
	43200, // 12 hours
	86400, // 1 day
	172800, // 2 days
	604800, // 7 days
	2592000, // 30 days
];

/**
 * Arbitrary: generates a random time range start (1000 - 1000000 epoch seconds).
 */
const startArb = fc.integer({ min: 1000, max: 1000000 });

/**
 * Arbitrary: generates a random duration (60 - 10000000 seconds).
 */
const durationArb = fc.integer({ min: 60, max: 10000000 });

/**
 * Arbitrary: generates a random panel width (100 - 2000 pixels).
 */
const widthArb = fc.integer({ min: 100, max: 2000 });

describe('Property 5: Time axis ticks are evenly spaced and aligned with segment boundaries', () => {
	describe('generateTicks tick positions are in [0, 1] range', () => {
		it('all tick positions are >= 0 and <= 1', () => {
			fc.assert(
				fc.property(startArb, durationArb, widthArb, (start, duration, width) => {
					const timeRange: TimeRange = { start, end: start + duration };
					const ticks = generateTicks(timeRange, width, 'UTC');

					for (const tick of ticks) {
						expect(tick.position).toBeGreaterThanOrEqual(0);
						expect(tick.position).toBeLessThanOrEqual(1);
					}
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('generateTicks consecutive ticks have equal timestamp spacing', () => {
		it('consecutive ticks share the same interval (evenly spaced)', () => {
			fc.assert(
				fc.property(startArb, durationArb, widthArb, (start, duration, width) => {
					const timeRange: TimeRange = { start, end: start + duration };
					const ticks = generateTicks(timeRange, width, 'UTC');

					if (ticks.length > 1) {
						const firstInterval = ticks[1].timestamp - ticks[0].timestamp;
						expect(firstInterval).toBeGreaterThan(0);

						for (let i = 2; i < ticks.length; i++) {
							const interval = ticks[i].timestamp - ticks[i - 1].timestamp;
							expect(interval).toBe(firstInterval);
						}
					}
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('generateTicks axis boundaries alignment', () => {
		it('first tick position >= 0 (left edge is timeRange.start)', () => {
			fc.assert(
				fc.property(startArb, durationArb, widthArb, (start, duration, width) => {
					const timeRange: TimeRange = { start, end: start + duration };
					const ticks = generateTicks(timeRange, width, 'UTC');

					if (ticks.length > 0) {
						expect(ticks[0].position).toBeGreaterThanOrEqual(0);
						// First tick timestamp is at or after the time range start
						expect(ticks[0].timestamp).toBeGreaterThanOrEqual(timeRange.start);
					}
				}),
				{ numRuns: 100 },
			);
		});

		it('last tick position <= 1 (right edge is timeRange.end)', () => {
			fc.assert(
				fc.property(startArb, durationArb, widthArb, (start, duration, width) => {
					const timeRange: TimeRange = { start, end: start + duration };
					const ticks = generateTicks(timeRange, width, 'UTC');

					if (ticks.length > 0) {
						const lastTick = ticks[ticks.length - 1];
						expect(lastTick.position).toBeLessThanOrEqual(1);
						// Last tick timestamp is at or before the time range end
						expect(lastTick.timestamp).toBeLessThanOrEqual(timeRange.end);
					}
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('computeTickInterval returns a value from the predefined intervals list', () => {
		it('for any positive time range, result is always from the INTERVALS list', () => {
			fc.assert(
				fc.property(durationArb, (duration) => {
					const result = computeTickInterval(duration);
					expect(INTERVALS).toContain(result);
				}),
				{ numRuns: 100 },
			);
		});

		it('for any positive time range and positive width, computeTickInterval returns a positive value', () => {
			fc.assert(
				fc.property(durationArb, (duration) => {
					const result = computeTickInterval(duration);
					expect(result).toBeGreaterThan(0);
				}),
				{ numRuns: 100 },
			);
		});
	});
});
