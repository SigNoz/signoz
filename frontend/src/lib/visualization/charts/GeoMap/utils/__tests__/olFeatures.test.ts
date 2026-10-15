import type Point from 'ol/geom/Point';
import { fromLonLat, transformExtent } from 'ol/proj';

import { COUNTRY_BY_ISO2 } from '../../geo/countries';
import { getCountryShapes } from '../../geo/shapes';
import { GeoMapDatum } from '../../types';
import {
	getViewExtent,
	toBubbleFeatures,
	toLabelFeatures,
	toPointFeatures,
	toShapeFeatures,
} from '../olFeatures';

const datum = (code: string): GeoMapDatum => ({ code, value: 1, raw: code });

describe('toShapeFeatures', () => {
	const { members, context } = toShapeFeatures(getCountryShapes('europe'));
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

describe('toBubbleFeatures', () => {
	it('places one point per value at its member’s label point', () => {
		const shapes = getCountryShapes('europe');
		const bubbles = toBubbleFeatures(
			[datum('DE'), datum('US'), datum('ZZ')],
			shapes,
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
		expect(getViewExtent('world', [], undefined)).toStrictEqual(
			transformExtent([-180, -58, 180, 75], 'EPSG:4326', 'EPSG:3857'),
		);
	});

	it('frames the US by its lower 48', () => {
		const [west] = getViewExtent('country', [], 'US');
		expect(west).toBeGreaterThan(fromLonLat([-130, 40])[0]);
	});
});

describe('toLabelFeatures', () => {
	const shapes = getCountryShapes('world');
	const { members } = toShapeFeatures(shapes);
	const labels = toLabelFeatures(shapes, members);
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
		const codes = toLabelFeatures(europe, toShapeFeatures(europe).members).map(
			(feature) => feature.get('code'),
		);
		expect(codes).toContain('DE');
		expect(codes).not.toContain('US');
	});
});

describe('toPointFeatures', () => {
	it('places each point at its lat/lon, keyed by its id', () => {
		const [paris] = toPointFeatures([
			{ id: 'p1', lat: 48.86, lon: 2.35, value: 1, label: 'Paris' },
		]);
		const [x, y] = (paris.getGeometry() as Point).getCoordinates();
		const [ex, ey] = fromLonLat([2.35, 48.86]);

		expect(paris.get('code')).toBe('p1');
		expect(x).toBeCloseTo(ex, 3);
		expect(y).toBeCloseTo(ey, 3);
	});
});
