import {
	getFillColor,
	lightenColor,
} from 'lib/visualization/charts/Pie/utils/colors';

describe('Pie colors', () => {
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
