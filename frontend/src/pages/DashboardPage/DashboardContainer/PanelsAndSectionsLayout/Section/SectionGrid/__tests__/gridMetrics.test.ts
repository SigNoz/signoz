import { gridItemHeight, gridItemWidth } from '../gridMetrics';

describe('gridMetrics', () => {
	it('sizes a half-width, six-row item like react-grid-layout', () => {
		expect(gridItemWidth(6)).toBe('calc(50% - 4px)');
		expect(gridItemHeight(6)).toBe(310);
	});

	it('spans the full padded width at every column', () => {
		expect(gridItemWidth(12)).toBe('calc(100% + 0px)');
	});
});
