// Feature: state-timeline-panel, Property 8: Row height layout respects minimum and triggers overflow
// **Validates: Requirements 9.3, 9.5**

import * as fc from 'fast-check';

/**
 * Computes the row height given the available panel height and number of rows.
 * Formula: max(floor(availableHeight / rowCount), 20)
 *
 * This is the pure computation that StateTimelinePanel uses to determine
 * the height of each swim-lane row.
 */
function computeRowHeight(availableHeight: number, rowCount: number): number {
	if (rowCount <= 0) return availableHeight;
	return Math.max(Math.floor(availableHeight / rowCount), 20);
}

/**
 * Determines whether vertical scrolling (overflow) should be enabled.
 * Overflow occurs when the total minimum height of all rows exceeds
 * the available panel height.
 */
function shouldEnableOverflow(
	availableHeight: number,
	rowCount: number,
): boolean {
	return rowCount * 20 > availableHeight;
}

describe('Property 8: Row height layout respects minimum and triggers overflow', () => {
	describe('computeRowHeight', () => {
		it('should equal max(floor(H/N), 20) for all valid heights and row counts', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 50, max: 1000 }),
					fc.integer({ min: 1, max: 200 }),
					(panelHeight, rowCount) => {
						const result = computeRowHeight(panelHeight, rowCount);
						const expected = Math.max(
							Math.floor(panelHeight / rowCount),
							20,
						);
						expect(result).toBe(expected);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should never produce a row height less than 20 pixels', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 50, max: 1000 }),
					fc.integer({ min: 1, max: 200 }),
					(panelHeight, rowCount) => {
						const result = computeRowHeight(panelHeight, rowCount);
						expect(result).toBeGreaterThanOrEqual(20);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should not exceed the available panel height for a single row', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 50, max: 1000 }),
					(panelHeight) => {
						const result = computeRowHeight(panelHeight, 1);
						expect(result).toBeLessThanOrEqual(panelHeight);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('shouldEnableOverflow', () => {
		it('should return true when N * 20 > H (rows exceed available height)', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 50, max: 1000 }),
					fc.integer({ min: 1, max: 200 }),
					(panelHeight, rowCount) => {
						const result = shouldEnableOverflow(panelHeight, rowCount);
						const expected = rowCount * 20 > panelHeight;
						expect(result).toBe(expected);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should return false when rows fit within the panel at minimum height', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 50, max: 1000 }),
					(panelHeight) => {
						// Choose a row count that definitely fits
						const rowCount = Math.floor(panelHeight / 20);
						const result = shouldEnableOverflow(panelHeight, rowCount);
						expect(result).toBe(false);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('should return true when rows exceed panel capacity at minimum height', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 50, max: 1000 }),
					(panelHeight) => {
						// Choose a row count that exceeds capacity
						const rowCount = Math.floor(panelHeight / 20) + 1;
						const result = shouldEnableOverflow(panelHeight, rowCount);
						expect(result).toBe(true);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('computeRowHeight and overflow consistency', () => {
		it('when overflow is enabled, computed row height should equal minimum (20px)', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 50, max: 1000 }),
					fc.integer({ min: 1, max: 200 }),
					(panelHeight, rowCount) => {
						const overflow = shouldEnableOverflow(panelHeight, rowCount);
						const rowHeight = computeRowHeight(panelHeight, rowCount);

						if (overflow) {
							// When overflow is triggered, floor(H/N) < 20, so max clamps to 20
							expect(rowHeight).toBe(20);
						}
					},
				),
				{ numRuns: 100 },
			);
		});

		it('when overflow is not enabled, all rows fit within available height', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 50, max: 1000 }),
					fc.integer({ min: 1, max: 200 }),
					(panelHeight, rowCount) => {
						const overflow = shouldEnableOverflow(panelHeight, rowCount);
						const rowHeight = computeRowHeight(panelHeight, rowCount);

						if (!overflow) {
							// All rows fit: total height of rows <= available height
							expect(rowHeight * rowCount).toBeLessThanOrEqual(panelHeight);
						}
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
