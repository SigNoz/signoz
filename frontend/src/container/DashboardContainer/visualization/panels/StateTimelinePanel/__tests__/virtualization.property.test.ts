// Feature: state-timeline-panel, Property 9: Virtualization renders only visible rows plus buffer
// **Validates: Requirements 11.4**

import * as fc from 'fast-check';

const BUFFER_SIZE = 5;

/**
 * Computes the range of rows that should be rendered given virtualization parameters.
 *
 * Given: total rows N, visible height H, row height R, scroll position S
 * - Visible rows = Math.ceil(H / R)
 * - First visible row index = Math.floor(S / R)
 * - Buffer = 5 rows above and below
 * - Rendered range: [max(0, firstVisible - 5), min(N-1, firstVisible + visibleCount - 1 + 5)]
 */
function computeRenderedRange(
	totalRows: number,
	visibleHeight: number,
	rowHeight: number,
	scrollPosition: number,
): { startIndex: number; endIndex: number; renderedCount: number } {
	if (totalRows <= 0 || rowHeight <= 0) {
		return { startIndex: 0, endIndex: -1, renderedCount: 0 };
	}

	const visibleCount = Math.ceil(visibleHeight / rowHeight);
	const firstVisibleIndex = Math.floor(scrollPosition / rowHeight);

	const startIndex = Math.max(0, firstVisibleIndex - BUFFER_SIZE);
	const endIndex = Math.min(
		totalRows - 1,
		firstVisibleIndex + visibleCount - 1 + BUFFER_SIZE,
	);

	const renderedCount = endIndex - startIndex + 1;

	return { startIndex, endIndex, renderedCount };
}

describe('Property 9: Virtualization renders only visible rows plus buffer', () => {
	describe('computeRenderedRange', () => {
		it('rendered count equals endIndex - startIndex + 1', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 500 }), // totalRows
					fc.integer({ min: 100, max: 800 }), // visibleHeight
					fc.integer({ min: 20, max: 50 }), // rowHeight
					fc.nat(), // scrollPosition seed (will be constrained)
					(totalRows, visibleHeight, rowHeight, scrollSeed) => {
						const maxScroll = Math.max(
							0,
							totalRows * rowHeight - visibleHeight,
						);
						const scrollPosition = maxScroll > 0 ? scrollSeed % (maxScroll + 1) : 0;

						const { startIndex, endIndex, renderedCount } = computeRenderedRange(
							totalRows,
							visibleHeight,
							rowHeight,
							scrollPosition,
						);

						expect(renderedCount).toBe(endIndex - startIndex + 1);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('rendered count should not exceed visibleCount + 2 * buffer (10)', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 500 }), // totalRows
					fc.integer({ min: 100, max: 800 }), // visibleHeight
					fc.integer({ min: 20, max: 50 }), // rowHeight
					fc.nat(), // scrollPosition seed
					(totalRows, visibleHeight, rowHeight, scrollSeed) => {
						const maxScroll = Math.max(
							0,
							totalRows * rowHeight - visibleHeight,
						);
						const scrollPosition = maxScroll > 0 ? scrollSeed % (maxScroll + 1) : 0;

						const visibleCount = Math.ceil(visibleHeight / rowHeight);
						const { renderedCount } = computeRenderedRange(
							totalRows,
							visibleHeight,
							rowHeight,
							scrollPosition,
						);

						// Rendered count should never exceed visible rows + 2 * buffer
						expect(renderedCount).toBeLessThanOrEqual(
							visibleCount + 2 * BUFFER_SIZE,
						);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('rendered count should not exceed total rows', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 500 }), // totalRows
					fc.integer({ min: 100, max: 800 }), // visibleHeight
					fc.integer({ min: 20, max: 50 }), // rowHeight
					fc.nat(), // scrollPosition seed
					(totalRows, visibleHeight, rowHeight, scrollSeed) => {
						const maxScroll = Math.max(
							0,
							totalRows * rowHeight - visibleHeight,
						);
						const scrollPosition = maxScroll > 0 ? scrollSeed % (maxScroll + 1) : 0;

						const { renderedCount } = computeRenderedRange(
							totalRows,
							visibleHeight,
							rowHeight,
							scrollPosition,
						);

						// Can't render more rows than total
						expect(renderedCount).toBeLessThanOrEqual(totalRows);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('startIndex should always be >= 0', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 500 }), // totalRows
					fc.integer({ min: 100, max: 800 }), // visibleHeight
					fc.integer({ min: 20, max: 50 }), // rowHeight
					fc.nat(), // scrollPosition seed
					(totalRows, visibleHeight, rowHeight, scrollSeed) => {
						const maxScroll = Math.max(
							0,
							totalRows * rowHeight - visibleHeight,
						);
						const scrollPosition = maxScroll > 0 ? scrollSeed % (maxScroll + 1) : 0;

						const { startIndex } = computeRenderedRange(
							totalRows,
							visibleHeight,
							rowHeight,
							scrollPosition,
						);

						expect(startIndex).toBeGreaterThanOrEqual(0);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('endIndex should always be < totalRows', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 500 }), // totalRows
					fc.integer({ min: 100, max: 800 }), // visibleHeight
					fc.integer({ min: 20, max: 50 }), // rowHeight
					fc.nat(), // scrollPosition seed
					(totalRows, visibleHeight, rowHeight, scrollSeed) => {
						const maxScroll = Math.max(
							0,
							totalRows * rowHeight - visibleHeight,
						);
						const scrollPosition = maxScroll > 0 ? scrollSeed % (maxScroll + 1) : 0;

						const { endIndex } = computeRenderedRange(
							totalRows,
							visibleHeight,
							rowHeight,
							scrollPosition,
						);

						expect(endIndex).toBeLessThan(totalRows);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('all visible rows should be included in the rendered range', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 500 }), // totalRows
					fc.integer({ min: 100, max: 800 }), // visibleHeight
					fc.integer({ min: 20, max: 50 }), // rowHeight
					fc.nat(), // scrollPosition seed
					(totalRows, visibleHeight, rowHeight, scrollSeed) => {
						const maxScroll = Math.max(
							0,
							totalRows * rowHeight - visibleHeight,
						);
						const scrollPosition = maxScroll > 0 ? scrollSeed % (maxScroll + 1) : 0;

						const firstVisibleIndex = Math.floor(scrollPosition / rowHeight);
						const visibleCount = Math.ceil(visibleHeight / rowHeight);
						const lastVisibleIndex = Math.min(
							totalRows - 1,
							firstVisibleIndex + visibleCount - 1,
						);

						const { startIndex, endIndex } = computeRenderedRange(
							totalRows,
							visibleHeight,
							rowHeight,
							scrollPosition,
						);

						// All visible rows must be within the rendered range
						expect(startIndex).toBeLessThanOrEqual(firstVisibleIndex);
						expect(endIndex).toBeGreaterThanOrEqual(lastVisibleIndex);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('buffer above should be at most 5 rows', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 500 }), // totalRows
					fc.integer({ min: 100, max: 800 }), // visibleHeight
					fc.integer({ min: 20, max: 50 }), // rowHeight
					fc.nat(), // scrollPosition seed
					(totalRows, visibleHeight, rowHeight, scrollSeed) => {
						const maxScroll = Math.max(
							0,
							totalRows * rowHeight - visibleHeight,
						);
						const scrollPosition = maxScroll > 0 ? scrollSeed % (maxScroll + 1) : 0;

						const firstVisibleIndex = Math.floor(scrollPosition / rowHeight);

						const { startIndex } = computeRenderedRange(
							totalRows,
							visibleHeight,
							rowHeight,
							scrollPosition,
						);

						// Buffer above: firstVisibleIndex - startIndex should be at most BUFFER_SIZE
						const bufferAbove = firstVisibleIndex - startIndex;
						expect(bufferAbove).toBeLessThanOrEqual(BUFFER_SIZE);
						expect(bufferAbove).toBeGreaterThanOrEqual(0);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('buffer below should be at most 5 rows', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 500 }), // totalRows
					fc.integer({ min: 100, max: 800 }), // visibleHeight
					fc.integer({ min: 20, max: 50 }), // rowHeight
					fc.nat(), // scrollPosition seed
					(totalRows, visibleHeight, rowHeight, scrollSeed) => {
						const maxScroll = Math.max(
							0,
							totalRows * rowHeight - visibleHeight,
						);
						const scrollPosition = maxScroll > 0 ? scrollSeed % (maxScroll + 1) : 0;

						const firstVisibleIndex = Math.floor(scrollPosition / rowHeight);
						const visibleCount = Math.ceil(visibleHeight / rowHeight);
						const lastVisibleIndex = Math.min(
							totalRows - 1,
							firstVisibleIndex + visibleCount - 1,
						);

						const { endIndex } = computeRenderedRange(
							totalRows,
							visibleHeight,
							rowHeight,
							scrollPosition,
						);

						// Buffer below: endIndex - lastVisibleIndex should be at most BUFFER_SIZE
						const bufferBelow = endIndex - lastVisibleIndex;
						expect(bufferBelow).toBeLessThanOrEqual(BUFFER_SIZE);
						expect(bufferBelow).toBeGreaterThanOrEqual(0);
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
