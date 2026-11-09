import {
	buildDistributionTooltipRows,
	formatBucketRange,
	formatPercent,
} from '../distributionTooltipContent';

const formatBound = (value: number): string => `${value} ms`;

describe('formatBucketRange', () => {
	it('names a finite bucket by both bounds and the open ones by their one', () => {
		const base = {
			lower: 250,
			upper: 500,
			isUnderflow: false,
			isOverflow: false,
		};

		expect(formatBucketRange(base, formatBound)).toBe('(250 ms, 500 ms]');
		expect(formatBucketRange({ ...base, isUnderflow: true }, formatBound)).toBe(
			'≤ 500 ms',
		);
		expect(formatBucketRange({ ...base, isOverflow: true }, formatBound)).toBe(
			'> 250 ms',
		);
	});
});

describe('formatPercent', () => {
	it('rounds, and never shows a real share as 0%', () => {
		expect(formatPercent(0.256)).toBe('26%');
		expect(formatPercent(0.004)).toBe('<1%');
		expect(formatPercent(0)).toBe('0%');
	});
});

describe('buildDistributionTooltipRows', () => {
	const args = {
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
	};

	it("gives each visible group's count, share and cumulative share", () => {
		const rows = buildDistributionTooltipRows({
			...args,
		});

		expect(rows).toStrictEqual([
			{
				label: 'cart',
				color: '#f00',
				count: 6,
				share: 0.6,
				cumulativeShare: 0.8,
				isHovered: true,
			},
			{
				label: 'checkout',
				color: '#0f0',
				count: 0,
				share: 0,
				cumulativeShare: 0.5,
				isHovered: false,
			},
		]);
	});

	it('lists every visible group, whatever the stacking', () => {
		const rows = buildDistributionTooltipRows(args);

		expect(rows.map(({ label }) => label)).toStrictEqual(['cart', 'checkout']);
	});
});
