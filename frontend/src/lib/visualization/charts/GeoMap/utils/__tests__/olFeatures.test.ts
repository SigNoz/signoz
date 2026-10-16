import type Point from 'ol/geom/Point';
import { fromLonLat, transformExtent } from 'ol/proj';

import { COUNTRY_BY_ISO2 } from '../../geo/countries';
import { getCountryShapes } from '../../geo/shapes';
import { GeoMapDatum } from '../../types';
import VectorSource from 'ol/source/Vector';

import {
	findShapeAt,
	getViewExtent,
	toBubbleFeatures,
	toLabelFeatures,
	toPointFeatures,
	toShapeFeatures,
	toWebGLPointFeatures,
} from '../olFeatures';
import { toOlProjection } from '../olProjections';

const datum = (code: string): GeoMapDatum => ({ code, value: 1, raw: code });

describe('toShapeFeatures', () => {
	const { members, context } = toShapeFeatures(
		getCountryShapes('europe'),
		'mercator',
	);
	const codes = (features: typeof members): unknown[] =>
		features.map((feature) => feature.get('code'));

	it('splits a view’s members from its context', () => {
		expect(codes(members)).toContain('DE');
		expect(codes(members)).not.toContain('US');
		expect(codes(context)).toContain('US');
	});

	it('projects outlines to Web Mercator', () => {
		const germany = members.find((feature) => feature.get('code') === 'DE');
		const [west] = germany?.getGeometry()?.getExtent() ?? [];
		expect(west).toBeGreaterThan(fromLonLat([5, 50])[0]);
	});
});

describe('findShapeAt', () => {
	const { members, context } = toShapeFeatures(
		getCountryShapes('europe'),
		'mercator',
	);
	const sources = [
		new VectorSource({ features: members }),
		new VectorSource({ features: context }),
	];

	it('finds the member or context shape a point falls in', () => {
		expect(findShapeAt(sources, [2.35, 48.86], 'mercator')).toBe('FR');
		expect(findShapeAt(sources, [78.49, 17.39], 'mercator')).toBe('IN');
	});

	it('finds nothing at sea', () => {
		expect(findShapeAt(sources, [-30, 30], 'mercator')).toBeNull();
	});
});

describe('toBubbleFeatures', () => {
	it('places one point per value at its member’s label point', () => {
		const shapes = getCountryShapes('europe');
		const bubbles = toBubbleFeatures(
			[datum('DE'), datum('US'), datum('ZZ')],
			shapes,
			'mercator',
		);
		const label = COUNTRY_BY_ISO2.get('DE')?.properties.label as [number, number];

		expect(bubbles.map((feature) => feature.get('code'))).toStrictEqual(['DE']);
		expect(bubbles[0].getGeometry()?.getExtent().slice(0, 2)).toStrictEqual(
			fromLonLat(label),
		);
	});
});

describe('getViewExtent', () => {
	it('spans the whole world in Web Mercator', () => {
		expect(getViewExtent('world', 'mercator', [], undefined)).toStrictEqual(
			transformExtent([-180, -58, 180, 75], 'EPSG:4326', 'EPSG:3857'),
		);
	});

	it('frames the US by its lower 48', () => {
		const [west] = getViewExtent('country', 'mercator', [], 'US');
		expect(west).toBeGreaterThan(fromLonLat([-130, 40])[0]);
	});

	describe('on Equal Earth', () => {
		const code = toOlProjection('equal_earth');
		const [west, , , north] = getViewExtent(
			'world',
			'equal_earth',
			[],
			undefined,
		);

		it('frames the bulge at the equator, not just the box corners', () => {
			expect(west).toBeLessThan(fromLonLat([-180, -58], code)[0]);
			expect(west).toBeCloseTo(fromLonLat([-180, 0], code)[0], -5);
		});

		it('shows the Arctic Mercator crops', () => {
			expect(north).toBeCloseTo(fromLonLat([0, 84], code)[1], 3);
		});
	});
});

describe('on Equal Earth', () => {
	const shapes = getCountryShapes('europe');
	const { members, context } = toShapeFeatures(shapes, 'equal_earth');
	const code = toOlProjection('equal_earth');

	it('projects outlines and labels into it', () => {
		const germany = members.find((feature) => feature.get('code') === 'DE');
		const [west] = germany?.getGeometry()?.getExtent() ?? [];
		expect(west).toBeGreaterThan(fromLonLat([5, 50], code)[0]);
		expect(west).toBeLessThan(fromLonLat([7, 50], code)[0]);

		const de = toLabelFeatures(shapes, members, 'equal_earth').find(
			(feature) => feature.get('code') === 'DE',
		);
		const label = COUNTRY_BY_ISO2.get('DE')?.properties.label as [number, number];
		expect(de?.getGeometry()?.getExtent().slice(0, 2)).toStrictEqual(
			fromLonLat(label, code),
		);
	});

	it('finds the shape a lon/lat falls in', () => {
		const sources = [
			new VectorSource({ features: members }),
			new VectorSource({ features: context }),
		];
		expect(findShapeAt(sources, [2.35, 48.86], 'equal_earth')).toBe('FR');
		expect(findShapeAt(sources, [139.7, 35.7], 'equal_earth')).toBe('JP');
	});
});

describe('toLabelFeatures', () => {
	const shapes = getCountryShapes('world');
	const { members } = toShapeFeatures(shapes, 'mercator');
	const labels = toLabelFeatures(shapes, members, 'mercator');
	const label = (code: string) =>
		labels.find((feature) => feature.get('code') === code);

	it('names every member that has a code', () => {
		const coded = members.filter((feature) => feature.get('code'));
		expect(labels).toHaveLength(coded.length);
		expect(label('DE')?.get('name')).toBe('Germany');
	});

	it('sizes the fit by the largest polygon, so Alaska does not widen the US', () => {
		const [usWidth] = (label('US')?.get('box') ?? [Infinity]) as [number, number];
		const [west, , east] = transformExtent(
			[-125, 24, -66, 50],
			'EPSG:4326',
			'EPSG:3857',
		);
		expect(usWidth).toBeLessThan((east - west) * 1.1);
	});

	it('labels members only, never the faint neighbours', () => {
		const europe = getCountryShapes('europe');
		const codes = toLabelFeatures(
			europe,
			toShapeFeatures(europe, 'mercator').members,
			'mercator',
		).map((feature) => feature.get('code'));
		expect(codes).toContain('DE');
		expect(codes).not.toContain('US');
	});
});

describe('toPointFeatures', () => {
	it('places each point at its lat/lon, keyed by its id', () => {
		const [paris] = toPointFeatures(
			[{ id: 'p1', lat: 48.86, lon: 2.35, value: 1, label: 'Paris' }],
			'mercator',
		);
		const [x, y] = (paris.getGeometry() as Point).getCoordinates();
		const [ex, ey] = fromLonLat([2.35, 48.86]);

		expect(paris.get('code')).toBe('p1');
		expect(x).toBeCloseTo(ex, 3);
		expect(y).toBeCloseTo(ey, 3);
	});
});

describe('toWebGLPointFeatures', () => {
	const points = [
		{ id: 'small', lat: 0, lon: 0, value: 1, label: 'Small' },
		{ id: 'large', lat: 10, lon: 10, value: 9, label: 'Large' },
		{ id: 'unsized', lat: 20, lon: 20, value: 5, label: 'Unsized' },
	];
	const features = toWebGLPointFeatures(points, {
		fillFor: (code) => (code === 'large' ? '#ff0000' : null),
		radiusFor: (size) => size,
		sizeByCode: new Map([
			['small', 2],
			['large', 12],
		]),
		noData: '#333333',
		projection: 'mercator',
	});
	const byId = (id: string) =>
		features.find((feature) => feature.getId() === id);

	it('draws largest first, so small points land on top', () => {
		expect(features.map((feature) => feature.getId())).toStrictEqual([
			'large',
			'small',
		]);
	});

	it('skips points with nothing to size them by', () => {
		expect(byId('unsized')).toBeUndefined();
	});

	it('carries the colour, radius and outline the GPU style reads', () => {
		expect(byId('large')?.get('color')).toStrictEqual([255, 0, 0, 0.8]);
		expect(byId('large')?.get('radius')).toBe(12);
		expect(byId('large')?.get('stroke')).toBe(1);
		expect(byId('small')?.get('color')).toStrictEqual([51, 51, 51, 0.8]);
		expect(byId('small')?.get('stroke')).toBe(0);
	});
});
