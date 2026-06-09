import {
	getArcGeometry,
	getFillColor,
	getScaledFontSize,
	lightenColor,
} from '../utils';

describe('Pie utils', () => {
	describe('getScaledFontSize', () => {
		it('returns the base size for empty text', () => {
			expect(getScaledFontSize({ text: '', baseSize: 30, innerRadius: 100 })).toBe(
				30,
			);
		});

		it('does not scale short text (length <= 3)', () => {
			// scaleFactor = max(0.3, 1) = 1 → baseSize, capped by innerRadius * 0.9.
			expect(
				getScaledFontSize({ text: '3.7', baseSize: 30, innerRadius: 100 }),
			).toBe(30);
		});

		it('scales longer text down', () => {
			// length 8 → scaleFactor = max(0.3, 1 - 5 * 0.09) = 0.55 → 30 * 0.55.
			expect(
				getScaledFontSize({ text: '12345678', baseSize: 30, innerRadius: 100 }),
			).toBeCloseTo(16.5);
		});

		it('floors the scale factor at 0.3 for very long text', () => {
			// length 20 → 1 - 17 * 0.09 < 0.3 → floored to 0.3 → 100 * 0.3.
			expect(
				getScaledFontSize({
					text: '12345678901234567890',
					baseSize: 100,
					innerRadius: 1000,
				}),
			).toBeCloseTo(30);
		});

		it('caps the size at 90% of the inner radius', () => {
			expect(
				getScaledFontSize({ text: '3.7', baseSize: 200, innerRadius: 10 }),
			).toBeCloseTo(9);
		});
	});

	describe('getArcGeometry', () => {
		it('places the label below for a slice centred at the top (angle 0)', () => {
			const g = getArcGeometry(0, 0, 100);
			expect(g.labelX).toBeCloseTo(0);
			expect(g.labelY).toBeCloseTo(-130);
			expect(g.lineEndX).toBeCloseTo(0);
			expect(g.lineEndY).toBeCloseTo(-110);
			// sin(0) is not > 0 → anchor end.
			expect(g.textAnchor).toBe('end');
		});

		it('anchors to the start on the right half (angle pi/2)', () => {
			const g = getArcGeometry(0, Math.PI, 100);
			expect(g.labelX).toBeCloseTo(130);
			expect(g.labelY).toBeCloseTo(0);
			expect(g.textAnchor).toBe('start');
		});

		it('anchors to the end on the left half (angle 3pi/2)', () => {
			const g = getArcGeometry(Math.PI, 2 * Math.PI, 100);
			expect(g.labelX).toBeCloseTo(-130);
			expect(g.textAnchor).toBe('end');
		});
	});

	describe('lightenColor', () => {
		it('converts a #rrggbb hex to rgba at the given opacity', () => {
			expect(lightenColor('#ff0000', 0.4)).toBe('rgba(255, 0, 0, 0.4)');
		});

		it('accepts hex without a leading #', () => {
			expect(lightenColor('00ff00', 0.4)).toBe('rgba(0, 255, 0, 0.4)');
		});

		it('returns the original colour when it is not parseable hex', () => {
			expect(lightenColor('rgba(0,0,0,1)', 0.4)).toBe('rgba(0,0,0,1)');
			expect(lightenColor('red', 0.4)).toBe('red');
		});
	});

	describe('getFillColor', () => {
		it('returns the colour unchanged when nothing is active', () => {
			expect(getFillColor('#ff0000', null)).toBe('#ff0000');
		});

		it('returns the colour unchanged for the active slice', () => {
			expect(getFillColor('#ff0000', '#ff0000')).toBe('#ff0000');
		});

		it('dims non-active slices to 40% opacity', () => {
			expect(getFillColor('#00ff00', '#ff0000')).toBe('rgba(0, 255, 0, 0.4)');
		});
	});
});
