import { fromLonLat, transformExtent } from 'ol/proj';

import { COUNTRY_BY_ISO2 } from '../../geo/countries';
import { getCountryShapes } from '../../geo/shapes';
import { GeoMapDatum } from '../../types';
import {
	getViewExtent,
	toBubbleFeatures,
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
