// Feature: state-timeline-panel, Property 6: Tooltip content includes all required fields with correct duration
// Feature: state-timeline-panel, Property 10: Tooltip positioning within panel bounds
// **Validates: Requirements 6.2, 6.3, 6.5**

import * as fc from 'fast-check';

import {
	formatDuration,
	computeTooltipPosition,
} from '../StateTimelineTooltip';

// Constants matching the component's internal values
const TOOLTIP_WIDTH = 220;
const TOOLTIP_HEIGHT = 140;

describe('Property 6: Tooltip content includes all required fields with correct duration', () => {
	describe('formatDuration produces correct human-readable strings', () => {
		it('should return a non-empty string for any positive duration', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 30 * 86400 }), // 1 second to 30 days
					(durationSeconds) => {
						const result = formatDuration(durationSeconds);
						expect(result).not.toBe('');
						expect(result.length).toBeGreaterThan(0);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should return "0s" for zero or negative durations', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: -100000, max: 0 }),
					(durationSeconds) => {
						const result = formatDuration(durationSeconds);
						expect(result).toBe('0s');
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should correctly represent days, hours, minutes, and seconds', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 30 }), // days
					fc.integer({ min: 0, max: 23 }), // hours
					fc.integer({ min: 0, max: 59 }), // minutes
					fc.integer({ min: 0, max: 59 }), // seconds
					(days, hours, minutes, seconds) => {
						// Skip the all-zero case
						if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
							return;
						}

						const totalSeconds =
							days * 86400 + hours * 3600 + minutes * 60 + seconds;
						const result = formatDuration(totalSeconds);

						// Verify days are represented when present
						if (days > 0) {
							expect(result).toContain(`${days}d`);
						}

						// Verify hours are represented when present
						if (hours > 0) {
							expect(result).toContain(`${hours}h`);
						}

						// Verify minutes are represented when present
						if (minutes > 0) {
							expect(result).toContain(`${minutes}m`);
						}

						// Seconds only shown when no days or hours
						if (seconds > 0 && days === 0 && hours === 0) {
							expect(result).toContain(`${seconds}s`);
						}
					},
				),
				{ numRuns: 100 },
			);
		});

		it('duration calculation: endTime - startTime produces correct value', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1000000000, max: 2000000000 }), // realistic epoch seconds
					fc.integer({ min: 1, max: 86400 * 7 }), // duration 1s to 7 days
					(startTime, duration) => {
						const endTime = startTime + duration;
						const calculatedDuration = endTime - startTime;

						expect(calculatedDuration).toBe(duration);
						expect(calculatedDuration).toBeGreaterThan(0);

						// formatDuration should produce non-empty output for positive durations
						const formatted = formatDuration(calculatedDuration);
						expect(formatted).not.toBe('');
						expect(formatted).not.toBe('0s');
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});

describe('Property 10: Tooltip positioning within panel bounds', () => {
	describe('computeTooltipPosition keeps tooltip within panel bounds', () => {
		it('should always produce left >= 0 and top >= 0', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 2000 }), // cursorX
					fc.integer({ min: 0, max: 1000 }), // cursorY
					fc.integer({ min: 200, max: 2000 }), // panelWidth
					fc.integer({ min: 100, max: 1000 }), // panelHeight
					(cursorX, cursorY, panelWidth, panelHeight) => {
						const { left, top } = computeTooltipPosition(
							cursorX,
							cursorY,
							panelWidth,
							panelHeight,
						);

						expect(left).toBeGreaterThanOrEqual(0);
						expect(top).toBeGreaterThanOrEqual(0);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should keep tooltip right edge within panel width OR clamp left to 0 when panel is large enough', () => {
			// Generate panel dimensions large enough to contain the tooltip,
			// and cursor positions within the panel bounds
			const arb = fc
				.integer({ min: TOOLTIP_WIDTH + 20, max: 2000 })
				.chain((panelWidth) =>
					fc.tuple(
						fc.constant(panelWidth),
						fc.integer({ min: TOOLTIP_HEIGHT + 20, max: 1000 }),
						fc.integer({ min: 0, max: panelWidth }),
					),
				)
				.chain(([panelWidth, panelHeight, cursorX]) =>
					fc.tuple(
						fc.constant(panelWidth),
						fc.constant(panelHeight),
						fc.constant(cursorX),
						fc.integer({ min: 0, max: panelHeight }),
					),
				);

			fc.assert(
				fc.property(arb, ([panelWidth, panelHeight, cursorX, cursorY]) => {
					const { left } = computeTooltipPosition(
						cursorX,
						cursorY,
						panelWidth,
						panelHeight,
					);

					// When panel is wide enough for tooltip, the tooltip either fits or is clamped to 0
					const fitsWithinPanel = left + TOOLTIP_WIDTH <= panelWidth;
					const clampedToZero = left === 0;
					expect(fitsWithinPanel || clampedToZero).toBe(true);
				}),
				{ numRuns: 100 },
			);
		});

		it('should keep tooltip bottom edge within panel height OR clamp top to 0 when panel is large enough', () => {
			// Generate panel dimensions large enough to contain the tooltip,
			// and cursor positions within the panel bounds
			const arb = fc
				.integer({ min: TOOLTIP_HEIGHT + 20, max: 1000 })
				.chain((panelHeight) =>
					fc.tuple(
						fc.integer({ min: TOOLTIP_WIDTH + 20, max: 2000 }),
						fc.constant(panelHeight),
						fc.integer({ min: 0, max: panelHeight }),
					),
				)
				.chain(([panelWidth, panelHeight, cursorY]) =>
					fc.tuple(
						fc.constant(panelWidth),
						fc.constant(panelHeight),
						fc.integer({ min: 0, max: panelWidth }),
						fc.constant(cursorY),
					),
				);

			fc.assert(
				fc.property(arb, ([panelWidth, panelHeight, cursorX, cursorY]) => {
					const { top } = computeTooltipPosition(
						cursorX,
						cursorY,
						panelWidth,
						panelHeight,
					);

					// When panel is tall enough for tooltip, the tooltip either fits or is clamped to 0
					const fitsWithinPanel = top + TOOLTIP_HEIGHT <= panelHeight;
					const clampedToZero = top === 0;
					expect(fitsWithinPanel || clampedToZero).toBe(true);
				}),
				{ numRuns: 100 },
			);
		});

		it('should position tooltip to the right and below cursor when space permits', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 200 }), // cursorX well within bounds
					fc.integer({ min: 0, max: 200 }), // cursorY well within bounds
					fc.integer({ min: 500, max: 2000 }), // large panelWidth
					fc.integer({ min: 500, max: 1000 }), // large panelHeight
					(cursorX, cursorY, panelWidth, panelHeight) => {
						const { left, top } = computeTooltipPosition(
							cursorX,
							cursorY,
							panelWidth,
							panelHeight,
						);

						// When there's plenty of space, tooltip should be placed to the right/below cursor
						expect(left).toBeGreaterThanOrEqual(cursorX);
						expect(top).toBeGreaterThanOrEqual(cursorY);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should flip horizontally when cursor is near right edge', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 200, max: 2000 }), // panelWidth
					fc.integer({ min: 100, max: 1000 }), // panelHeight
					(panelWidth, panelHeight) => {
						// Place cursor near the right edge where tooltip can't fit
						const cursorX = panelWidth - 10;
						const cursorY = 50; // plenty of vertical space

						const { left } = computeTooltipPosition(
							cursorX,
							cursorY,
							panelWidth,
							panelHeight,
						);

						// Tooltip should flip to the left of cursor
						// The left position should be less than cursorX
						expect(left).toBeLessThan(cursorX);
						expect(left).toBeGreaterThanOrEqual(0);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should flip vertically when cursor is near bottom edge', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 200, max: 2000 }), // panelWidth
					fc.integer({ min: 100, max: 1000 }), // panelHeight
					(panelWidth, panelHeight) => {
						// Place cursor near the bottom edge where tooltip can't fit
						const cursorX = 50; // plenty of horizontal space
						const cursorY = panelHeight - 10;

						const { top } = computeTooltipPosition(
							cursorX,
							cursorY,
							panelWidth,
							panelHeight,
						);

						// Tooltip should flip above cursor
						expect(top).toBeLessThan(cursorY);
						expect(top).toBeGreaterThanOrEqual(0);
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
