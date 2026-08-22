// Feature: state-timeline-panel, Property 11: Label column width clamping
// **Validates: Requirements 3.4**

import * as fc from 'fast-check';

import { computeColumnWidth } from '../LabelColumn';

const DEFAULT_MAX_WIDTH = 200;
const PADDING = 8;
const FONT = '12px Inter, sans-serif';

/**
 * Mock canvas measureText. Since jsdom does not support canvas measureText,
 * we mock document.createElement to return a fake canvas context that
 * estimates text width as roughly 7px per character (approximation for 12px font).
 */
const CHAR_WIDTH = 7;

function mockCanvasMeasureText(): void {
	const originalCreateElement = document.createElement.bind(document);

	jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
		if (tagName === 'canvas') {
			const fakeCanvas = {
				getContext: (): object => ({
					font: '',
					measureText: (text: string): { width: number } => ({
						width: text.length * CHAR_WIDTH,
					}),
				}),
			};
			return fakeCanvas as unknown as HTMLElement;
		}
		return originalCreateElement(tagName);
	});
}

beforeEach(() => {
	mockCanvasMeasureText();
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('Property 11: Label column width clamping', () => {
	it('computed width is always <= maxWidth for any set of labels', () => {
		fc.assert(
			fc.property(
				fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
					minLength: 1,
					maxLength: 20,
				}),
				fc.integer({ min: 50, max: 500 }),
				(labels, maxWidth) => {
					const result = computeColumnWidth(labels, maxWidth, FONT);
					expect(result).toBeLessThanOrEqual(maxWidth);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('computed width is always <= 200px with default max width', () => {
		fc.assert(
			fc.property(
				fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
					minLength: 1,
					maxLength: 20,
				}),
				(labels) => {
					const result = computeColumnWidth(labels, DEFAULT_MAX_WIDTH, FONT);
					expect(result).toBeLessThanOrEqual(DEFAULT_MAX_WIDTH);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('when labels are very long, width equals maxWidth (clamped)', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 50, max: 500 }),
				(maxWidth) => {
					// Generate labels long enough that measured width + padding exceeds maxWidth
					// Each char is ~7px, so a string of length ceil((maxWidth + 1) / CHAR_WIDTH)
					// ensures the measured width exceeds maxWidth after padding
					const longLength = Math.ceil((maxWidth + 1) / CHAR_WIDTH) + 10;
					const longLabel = 'x'.repeat(longLength);
					const labels = [longLabel];

					const result = computeColumnWidth(labels, maxWidth, FONT);
					expect(result).toBe(maxWidth);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('width equals measuredWidth + 2*padding when labels are short enough', () => {
		fc.assert(
			fc.property(
				fc.array(fc.string({ minLength: 1, maxLength: 5 }), {
					minLength: 1,
					maxLength: 10,
				}),
				(labels) => {
					// With maxLength=5 chars, max measured width = 5 * 7 = 35px
					// 35 + 16 (padding*2) = 51px, which is well under 200
					const result = computeColumnWidth(labels, DEFAULT_MAX_WIDTH, FONT);

					// Compute expected: longest label width + 2*PADDING
					const maxLabelWidth = Math.max(
						...labels.map((l) => l.length * CHAR_WIDTH),
					);
					const expected = Math.min(maxLabelWidth + PADDING * 2, DEFAULT_MAX_WIDTH);

					expect(result).toBe(expected);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('computed width is always >= 2*PADDING for non-empty label arrays', () => {
		fc.assert(
			fc.property(
				fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
					minLength: 1,
					maxLength: 20,
				}),
				(labels) => {
					const result = computeColumnWidth(labels, DEFAULT_MAX_WIDTH, FONT);
					// At least one char means at least CHAR_WIDTH + 2*PADDING
					expect(result).toBeGreaterThanOrEqual(CHAR_WIDTH + PADDING * 2);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('empty labels array returns 2*PADDING (measured width is 0)', () => {
		const result = computeColumnWidth([], DEFAULT_MAX_WIDTH, FONT);
		expect(result).toBe(PADDING * 2);
	});
});
