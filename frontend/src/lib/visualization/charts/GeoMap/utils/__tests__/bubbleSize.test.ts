import { GeoMapDatum } from '../../types';
import { bubbleSizeOf, getSizeLegendSteps } from '../scales';

describe('bubbleSizeOf', () => {
	const datum = (size?: number | null): GeoMapDatum => ({
		code: 'DE',
		value: 4,
		raw: 'DE',
		size,
	});

	it('sizes by the value when the map has no size metric', () => {
		expect(bubbleSizeOf(datum(900), false)).toBe(4);
	});

	it('sizes by the size metric when the map has one', () => {
		expect(bubbleSizeOf(datum(900), true)).toBe(900);
	});

	it.each([[undefined], [null], [0], [-5], [Number.NaN]])(
		'draws no bubble for a size of %p',
		(size) => {
			expect(bubbleSizeOf(datum(size), true)).toBeNull();
		},
	);
});

describe('getSizeLegendSteps', () => {
	it('references the largest size and a quarter of it', () => {
		expect(getSizeLegendSteps(1000)).toStrictEqual([1000, 250]);
	});

	it('has nothing to show without a positive size', () => {
		expect(getSizeLegendSteps(0)).toStrictEqual([]);
	});
});
