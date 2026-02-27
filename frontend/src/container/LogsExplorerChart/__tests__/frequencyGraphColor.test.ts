import { Color } from '@signozhq/design-tokens';

import { getColorsForSeverityLabels, isRedLike } from '../utils';

describe('getColorsForSeverityLabels', () => {
	it('should return slate for blank labels', () => {
		expect(getColorsForSeverityLabels('', 0)).toBe(Color.BG_SLATE_300);
		expect(getColorsForSeverityLabels('   ', 0)).toBe(Color.BG_SLATE_300);
	});

	it('should return correct colors for known severity variants', () => {
		expect(getColorsForSeverityLabels('INFO', 0)).toBe(Color.BG_ROBIN_600);
		expect(getColorsForSeverityLabels('ERROR', 0)).toBe(Color.BG_CHERRY_600);
		expect(getColorsForSeverityLabels('WARN', 0)).toBe(Color.BG_AMBER_600);
		expect(getColorsForSeverityLabels('DEBUG', 0)).toBe(Color.BG_AQUA_600);
		expect(getColorsForSeverityLabels('TRACE', 0)).toBe(Color.BG_FOREST_600);
		expect(getColorsForSeverityLabels('FATAL', 0)).toBe(Color.BG_SAKURA_600);
	});

	it('should return non-red colors for unrecognized labels at any index', () => {
		for (let i = 0; i < 30; i++) {
			const color = getColorsForSeverityLabels('4', i);
			expect(isRedLike(color)).toBe(false);
		}
	});

	it('should return non-red colors for numeric severity text', () => {
		const numericLabels = ['1', '2', '4', '9', '13', '17', '21'];
		numericLabels.forEach((label) => {
			const color = getColorsForSeverityLabels(label, 0);
			expect(isRedLike(color)).toBe(false);
		});
	});
});
