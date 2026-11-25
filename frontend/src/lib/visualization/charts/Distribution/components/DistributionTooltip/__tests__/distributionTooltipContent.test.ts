import {
	buildDistributionTooltipItems,
	buildOtherMemberItems,
	resolveGroupLabelFormat,
} from '../distributionTooltipContent';

describe('resolveGroupLabelFormat', () => {
	it('shows the value of a single key every group shares', () => {
		const format = resolveGroupLabelFormat([
			{ 'service.name': 'cart' },
			{ 'service.name': 'checkout' },
		]);

		expect(format('{service.name="cart"}', { 'service.name': 'cart' })).toBe(
			'cart',
		);
	});

	it('keeps Other, with no group labels, as it is', () => {
		const format = resolveGroupLabelFormat([
			{ 'service.name': 'cart' },
			undefined,
		]);

		expect(format('Other', undefined)).toBe('Other');
	});

	it('keeps full labels for several keys or none', () => {
		const several = resolveGroupLabelFormat([
			{ env: 'prod', 'service.name': 'cart' },
		]);
		const ungrouped = resolveGroupLabelFormat([{}]);

		expect(several('prod cart', { env: 'prod', 'service.name': 'cart' })).toBe(
			'prod cart',
		);
		expect(ungrouped('{}', {})).toBe('{}');
	});
});

describe('buildDistributionTooltipItems', () => {
	it('sorts the groups largest first and returns the hovered one as active', () => {
		const { active, items } = buildDistributionTooltipItems({
			labels: ['cart', 'checkout'],
			colors: ['#f00', '#0f0'],
			counts: [
				[2, 6, 2],
				[1, 8, 1],
			],
			bucket: 1,
			hoveredSeries: 0,
			formatLabel: (label) => label.toUpperCase(),
		});

		expect(items).toStrictEqual([
			{
				label: 'CHECKOUT',
				value: 8,
				tooltipValue: '8',
				color: '#0f0',
				isActive: false,
			},
			{
				label: 'CART',
				value: 6,
				tooltipValue: '6',
				color: '#f00',
				isActive: true,
			},
		]);
		expect(active).toBe(items[1]);
	});
});

describe('buildOtherMemberItems', () => {
	it('lists every member of Other, largest in the bucket first', () => {
		const members = buildOtherMemberItems({
			members: [
				{
					sourceIndex: 4,
					label: 'a',
					groupLabels: { 'service.name': 'cart' },
					color: '#a',
					counts: [1, 3],
				},
				{
					sourceIndex: 7,
					label: 'b',
					groupLabels: { 'service.name': 'ad' },
					color: '#b',
					counts: [0, 5],
				},
				{
					sourceIndex: 9,
					label: 'c',
					groupLabels: { 'service.name': 'quote' },
					color: '#c',
					counts: [2, 0],
				},
			],
			bucket: 1,
			formatLabel: (label, groupLabels) => groupLabels?.['service.name'] ?? label,
		});

		expect(
			members.map(({ sourceIndex, item }) => [
				sourceIndex,
				item.label,
				item.value,
			]),
		).toStrictEqual([
			[7, 'ad', 5],
			[4, 'cart', 3],
			[9, 'quote', 0],
		]);
	});
});
