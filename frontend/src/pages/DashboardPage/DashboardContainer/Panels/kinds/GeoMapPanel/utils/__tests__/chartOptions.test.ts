import {
	resolveBubbleRadius,
	resolveColors,
	toColorKeys,
} from '../chartOptions';

describe('resolveColors', () => {
	it('fills every default', () => {
		expect(resolveColors(undefined)).toStrictEqual({
			mode: 'palette',
			fill: '',
			palette: 'lava',
			scale: 'log',
			steps: 64,
			min: null,
			max: null,
		});
	});
});

describe('resolveBubbleRadius', () => {
	it('defaults per layer', () => {
		expect(resolveBubbleRadius(undefined, 'bubbles')).toStrictEqual([3, 28]);
		expect(resolveBubbleRadius(undefined, 'points')).toStrictEqual([2, 8]);
	});

	it('lifts the max to a larger min', () => {
		expect(resolveBubbleRadius({ minRadius: 12 }, 'points')).toStrictEqual([
			12, 12,
		]);
	});
});

describe('toColorKeys', () => {
	it('labels each threshold by its condition', () => {
		expect(
			toColorKeys([
				{ operator: '>=', value: 5, unit: 'percent', color: 'red' },
				{ value: 1000, color: 'blue' },
			]),
		).toStrictEqual([
			{ label: '≥ 5%', color: 'red' },
			{ label: '> 1,000', color: 'blue' },
		]);
	});

	it("reads a threshold without a unit in the color column's", () => {
		expect(
			toColorKeys(
				[
					{ operator: '>', value: 200, color: 'red' },
					{ operator: '<', value: 1, unit: 's', color: 'blue' },
				],
				'ms',
			).map(({ label }) => label),
		).toStrictEqual(['> 200 ms', '< 1 s']);
	});
});
