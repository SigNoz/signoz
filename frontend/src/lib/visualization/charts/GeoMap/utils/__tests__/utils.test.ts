import type { TransformMatrix } from '@visx/zoom/lib/types';
import { getRampBottom } from 'lib/visualization/colorRamp/colorScale';
import {
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import { GeoMapDatum } from '../../types';
import { codeOf } from '../dom';
import {
	createGeoMapColorResolver,
	createRadiusScale,
	rankData,
} from '../scales';
import { constrainZoom, MAX_ZOOM } from '../zoom';

const data = (...values: number[]): GeoMapDatum[] =>
	values.map((value, index) => ({ code: `C${index}`, value, raw: `C${index}` }));

describe('createRadiusScale', () => {
	const radius = createRadiusScale(data(0, 25, 100), [3, 30]);

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
		expect(createRadiusScale(data(0, 0), [3, 30])(0)).toBe(3);
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
});

describe('constrainZoom', () => {
	const constrain = constrainZoom(200, 100);
	const transform = (overrides: Partial<TransformMatrix>): TransformMatrix => ({
		scaleX: 1,
		scaleY: 1,
		translateX: 0,
		translateY: 0,
		skewX: 0,
		skewY: 0,
		...overrides,
	});

	it('stops zooming out past the fitted map', () => {
		expect(constrain(transform({ scaleX: 0.5, scaleY: 0.5 }))).toMatchObject({
			scaleX: 1,
			translateX: 0,
		});
	});

	it('caps zooming in', () => {
		expect(constrain(transform({ scaleX: 99, scaleY: 99 })).scaleX).toBe(
			MAX_ZOOM,
		);
	});

	it('keeps the zoomed map covering the panel', () => {
		const panned = constrain(
			transform({ scaleX: 2, scaleY: 2, translateX: 50, translateY: -500 }),
		);
		expect(panned.translateX).toBe(0);
		expect(panned.translateY).toBe(-100);
	});
});

describe('codeOf', () => {
	it('reads the shape code off a map element', () => {
		const element = document.createElementNS(
			'http://www.w3.org/2000/svg',
			'path',
		);
		element.setAttribute('data-code', 'US-CA');
		expect(codeOf(element)).toBe('US-CA');
	});

	it('is null for anything else', () => {
		expect(codeOf(document.createElement('div'))).toBeNull();
	});
});
