import { getRampBottom } from 'lib/visualization/colorRamp/colorScale';
import {
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import { GeoMapDatum } from '../../types';
import {
	bubbleSizeOf,
	createGeoMapColorResolver,
	createRadiusScale,
	getSizeLegendSteps,
	rankData,
} from '../scales';

const data = (...values: number[]): GeoMapDatum[] =>
	values.map((value, index) => ({ code: `C${index}`, value, raw: `C${index}` }));

describe('createRadiusScale', () => {
	const radius = createRadiusScale([0, 25, 100], [3, 30]);

	it('floors the smallest value at the minimum radius', () => {
		expect(radius(0)).toBe(3);
	});

	it('gives the largest value the maximum radius', () => {
		expect(radius(100)).toBe(30);
	});

	it('grows area, not radius, with the value', () => {
		const area = (value: number): number => radius(value) ** 2 - 3 ** 2;
		expect(area(25) / area(100)).toBeCloseTo(0.25, 6);
	});

	it('sizes negative values by magnitude', () => {
		expect(radius(-100)).toBe(30);
	});

	it('keeps every bubble at the minimum when all values are zero', () => {
		expect(createRadiusScale([0, 0], [3, 30])(0)).toBe(3);
	});
});

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

describe('rankData', () => {
	it('ranks highest first with each value’s share of the total', () => {
		const ranks = rankData(data(10, 30, 60));
		expect(ranks.get('C2')).toStrictEqual({ rank: 1, share: 0.6 });
		expect(ranks.get('C0')).toStrictEqual({ rank: 3, share: 0.1 });
	});

	it('leaves negatives out of the total', () => {
		expect(rankData(data(-50, 50)).get('C1')?.share).toBe(1);
	});
});

describe('createGeoMapColorResolver', () => {
	const colors = {
		palette: ColorRampPalette.Lava,
		scale: ColorRampScale.Log,
		steps: 8,
		min: null,
		max: null,
	};

	it('spans the data, starting a log ramp at its floor', () => {
		const resolver = createGeoMapColorResolver(data(0.5, 20, 400), colors, true);
		expect(resolver.domain.max).toBe(400);
		expect(getRampBottom(resolver.domain, colors.scale)).toBe(0.5);
	});

	it('honours an explicit clamp', () => {
		const resolver = createGeoMapColorResolver(
			data(1, 1000),
			{ ...colors, min: 10, max: 100 },
			true,
		);
		expect(resolver.domain).toMatchObject({ min: 10, max: 100 });
	});

	it('quantises into the requested steps', () => {
		expect(
			createGeoMapColorResolver(data(1, 10), colors, true).ramp,
		).toHaveLength(8);
	});

	it('colours zero from the ramp, not the panel surface', () => {
		const resolver = createGeoMapColorResolver(data(0, 10), colors, true);
		expect(resolver.colorFor(0)).toBe(resolver.ramp[0]);
	});

	it.each([true, false])(
		'keeps the lowest value off the near-background end (dark mode: %s)',
		(isDarkMode) => {
			const { ramp } = createGeoMapColorResolver(data(1, 10), colors, isDarkMode);
			expect(ramp[0]).not.toMatch(/^#(000004|fcfdbf)$/i);
		},
	);
});
