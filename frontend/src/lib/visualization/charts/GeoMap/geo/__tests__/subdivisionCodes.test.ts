import { SubdivisionCountry } from '../../types';
import { normalizeSubdivision } from '../normalizeSubdivision';
import { getSubdivisionShapes } from '../shapes';
import { loadSubdivisions, SubdivisionSet } from '../subdivisions';

describe('normalizeSubdivision across countries', () => {
	let us: SubdivisionSet;
	let india: SubdivisionSet;

	beforeAll(async () => {
		us = await loadSubdivisions('US');
		india = await loadSubdivisions('IN');
	});

	it.each([
		['TS', 'IN-TG'],
		['UK', 'IN-UT'],
		['CG', 'IN-CT'],
	])('resolves India’s newer code %p to the shape’s %p', (region, expected) => {
		expect(normalizeSubdivision(india, 'IN', region)).toBe(expected);
	});

	// The OpenTelemetry geoipprocessor reports MaxMind's most specific subdivision.
	it.each([
		['FR', '75', 'FR-75'],
		['IT', 'MI', 'IT-MI'],
		['ES', 'M', 'ES-M'],
		['GB', 'WSM', 'GB-WSM'],
		['IE', 'D', 'IE-D'],
		['BE', 'VAN', 'BE-VAN'],
	])(
		'places %s’s most specific region %p as %p',
		async (country, region, expected) => {
			const set = await loadSubdivisions(country as SubdivisionCountry);
			expect(normalizeSubdivision(set, country, region)).toBe(expected);
		},
	);

	it('places Northern Ireland’s 2015 councils, and their retired districts', async () => {
		const gb = await loadSubdivisions('GB');
		expect(normalizeSubdivision(gb, 'GB', 'ABC')).toBe('GB-ABC');
		expect(normalizeSubdivision(gb, 'GB', 'ARM')).toBe('GB-ABC');
		expect(getSubdivisionShapes(gb).nameOf('GB-ABC')).toBe(
			'Armagh City, Banbridge and Craigavon',
		);
	});

	it('places Metro Manila by its current region code', async () => {
		const ph = await loadSubdivisions('PH');
		expect(normalizeSubdivision(ph, 'PH', '00')).toBe('PH-MNL');
	});

	it('refuses a region of another country', () => {
		expect(normalizeSubdivision(us, 'CA', 'ON')).toBeNull();
		expect(normalizeSubdivision(us, null, 'IN-MH')).toBeNull();
		expect(normalizeSubdivision(india, 'PK', 'Punjab')).toBeNull();
	});
});
