import {
	buildDistributionTooltipItems,
	buildOtherMemberItems,
} from '../distributionTooltipContent';

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
					color: '#a',
					counts: [1, 3],
				},
				{
					sourceIndex: 7,
					label: 'b',
					color: '#b',
					counts: [0, 5],
				},
				{
					sourceIndex: 9,
					label: 'c',
					color: '#c',
					counts: [2, 0],
				},
			],
			bucket: 1,
		});

		expect(
			members.map(({ sourceIndex, item }) => [
				sourceIndex,
				item.label,
				item.value,
			]),
		).toStrictEqual([
			[7, 'b', 5],
			[4, 'a', 3],
			[9, 'c', 0],
		]);
	});
});
