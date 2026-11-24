import {
	buildDistributionTooltipRows,
	formatPercent,
	resolveGroupColumn,
} from '../distributionTooltipContent';

describe('formatPercent', () => {
	it('rounds, and never shows a real share as 0%', () => {
		expect(formatPercent(0.256)).toBe('26%');
		expect(formatPercent(0.004)).toBe('<1%');
		expect(formatPercent(0)).toBe('0%');
	});
});

describe('resolveGroupColumn', () => {
	it('names the column after a shared single key and shows its values', () => {
		const column = resolveGroupColumn([
			{ 'service.name': 'cart' },
			{ 'service.name': 'checkout' },
		]);

		expect(column.heading).toBe('service.name');
		expect(column.format('cart service', 0)).toBe('cart');
		expect(column.format('checkout service', 1)).toBe('checkout');
	});

	it('keeps Other under the shared key, with its own label', () => {
		const column = resolveGroupColumn([{ 'service.name': 'cart' }, undefined]);

		expect(column.heading).toBe('service.name');
		expect(column.format('Other', 1)).toBe('Other');
	});

	it('keeps full labels for several keys or none', () => {
		const several = resolveGroupColumn([{ env: 'prod', 'service.name': 'cart' }]);
		const ungrouped = resolveGroupColumn([{}]);

		expect(several.heading).toBe('Group');
		expect(several.format('prod cart', 0)).toBe('prod cart');
		expect(ungrouped.heading).toBe('Group');
	});
});

describe('buildDistributionTooltipRows', () => {
	it('gives each drawn group, in legend order, its count and share', () => {
		const rows = buildDistributionTooltipRows({
			labels: ['cart', 'checkout'],
			colors: ['#f00', '#0f0'],
			counts: [
				[2, 6, 2],
				[5, 0, 5],
			],
			bucket: 1,
			hoveredSeries: 0,
			formatLabel: (label) => label.toUpperCase(),
		});

		expect(rows).toStrictEqual([
			{
				seriesIndex: 0,
				label: 'CART',
				color: '#f00',
				count: 6,
				share: 0.6,
				isHovered: true,
			},
			{
				seriesIndex: 1,
				label: 'CHECKOUT',
				color: '#0f0',
				count: 0,
				share: 0,
				isHovered: false,
			},
		]);
	});
});
