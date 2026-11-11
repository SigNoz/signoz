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
			'{service.name="cart"}',
			'{service.name="checkout"}',
		]);

		expect(column.heading).toBe('service.name');
		expect(column.format('{service.name="cart"}')).toBe('cart');
	});

	it('keeps full labels for several keys or mixed labels', () => {
		const several = resolveGroupColumn(['{env="prod", service.name="cart"}']);
		const mixed = resolveGroupColumn(['{service.name="cart"}', 'Other']);

		expect(several.heading).toBe('Group');
		expect(several.format('{env="prod", service.name="cart"}')).toBe(
			'{env="prod", service.name="cart"}',
		);
		expect(mixed.heading).toBe('Group');
	});
});

describe('buildDistributionTooltipRows', () => {
	it('gives each visible group, in legend order, its count, share and cumulative share', () => {
		const rows = buildDistributionTooltipRows({
			labels: ['cart', 'checkout', 'search'],
			colors: ['#f00', '#0f0', '#00f'],
			counts: [
				[2, 6, 2],
				[5, 0, 5],
				[1, 1, 8],
			],
			visible: [true, true, false],
			bucket: 1,
			hoveredSeries: 0,
			formatLabel: (label) => label.toUpperCase(),
		});

		expect(rows).toStrictEqual([
			{
				label: 'CART',
				color: '#f00',
				count: 6,
				share: 0.6,
				cumulativeShare: 0.8,
				isHovered: true,
			},
			{
				label: 'CHECKOUT',
				color: '#0f0',
				count: 0,
				share: 0,
				cumulativeShare: 0.5,
				isHovered: false,
			},
		]);
	});
});
